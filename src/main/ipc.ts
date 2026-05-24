import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { IpcChannels } from './types'
import type {
  Presentation,
  AppSettings,
  StreamStatus,
  Theme,
  DetectedCLI
} from '../renderer/src/types'
import { join } from 'path'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { themes } from '../renderer/src/lib/themes'

// ─── Stub imports (filled in later sessions) ──────────────────────────────────
// These modules will be implemented in their own files; referenced here as
// typed stubs so the IPC layer compiles and the full shape is clear upfront.
import { generatePresentation, regenerateSlide } from './generator'
import { exportToPptx } from './exporter'
import * as db from './db'

// ─── electron-store (ESM-only v11 — loaded via dynamic import) ───────────────
// We initialise the store once and cache the reference for all handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _store: any = null

/**
 * Generate a deterministic encryption key based on the user's app data directory.
 * This ensures the key is stable per-machine but not hardcoded in source.
 */
function getDerivedEncryptionKey(): string {
  const crypto = require('crypto')
  const userDataPath = app.getPath('userData')
  // Create a stable hash of the user data directory
  const hash = crypto.createHash('sha256').update(userDataPath).digest('hex')
  // Use first 32 chars (256 bits for AES-256)
  return hash.substring(0, 32)
}

/**
 * Clear corrupted settings file.
 * Called when settings deserialization fails (e.g., encryption key mismatch).
 */
function clearCorruptedSettingsFile(): void {
  try {
    const userDataPath = app.getPath('userData')
    const settingsFile = path.join(userDataPath, 'opengamma-settings.json')
    if (fs.existsSync(settingsFile)) {
      fs.unlinkSync(settingsFile)
      console.log('[ipc] Cleared corrupted settings file:', settingsFile)
    }
  } catch (err) {
    console.error('[ipc] Failed to clear settings file:', err)
  }
}

async function getStore(): Promise<{
  get: (key: string, defaultValue?: unknown) => unknown
  set: (key: string, value: unknown) => void
}> {
  if (_store) return _store
  // Dynamic import required because electron-store v11+ is ESM-only
  const { default: Store } = await import('electron-store')

  try {
    _store = new Store({
      name: 'opengamma-settings',
      // Encrypt the API key at rest on disk using a derived key (per-machine, not hardcoded)
      encryptionKey: getDerivedEncryptionKey(),
      defaults: {
        claudeApiKey: '',
        geminiApiKey: '',
        defaultTheme: 'midnight',
        defaultSlideCount: 8,
        defaultNarrative: 'explainer',
        defaultSaveLocation: '',
        includeSpeakerNotes: true,
        addReferralFooter: true,
        onboardingComplete: false,
        executionMode: 'local-cli',
        selectedCliId: '',
        cliTemperature: 0.7,
        cliMaxTokens: 2048,
        cliOutputMode: 'stream',
        cliCustomArgs: '',
        cliWorkingDir: '',
        cliEnvVars: ''
      } satisfies AppSettings
    })
  } catch (err: unknown) {
    // Settings file is corrupted (e.g., encrypted with old key).
    // Clear it and create fresh store with defaults.
    const message = err instanceof Error ? err.message : 'Unknown store initialization error'
    console.error('[ipc] Failed to initialize settings store:', message)
    console.log('[ipc] Recovering by clearing corrupted settings...')

    clearCorruptedSettingsFile()

    // Retry store initialization with fresh file
    _store = new Store({
      name: 'opengamma-settings',
      encryptionKey: getDerivedEncryptionKey(),
      defaults: {
        claudeApiKey: '',
        geminiApiKey: '',
        defaultTheme: 'midnight',
        defaultSlideCount: 8,
        defaultNarrative: 'explainer',
        defaultSaveLocation: '',
        includeSpeakerNotes: true,
        addReferralFooter: true,
        onboardingComplete: false,
        executionMode: 'local-cli',
        selectedCliId: '',
        cliTemperature: 0.7,
        cliMaxTokens: 2048,
        cliOutputMode: 'stream',
        cliCustomArgs: '',
        cliWorkingDir: '',
        cliEnvVars: ''
      } satisfies AppSettings
    })
  }

  return _store
}

// ─── Cancellation ─────────────────────────────────────────────────────────────
// A single AbortController lives at module scope. A new one is created at the
// start of each generation run and replaced on cancellation.
let activeAbortController: AbortController | null = null

// ─── Helper — resolve the current main window safely ─────────────────────────
// IPC handlers registered with ipcMain do not receive the window as an
// argument, so we look it up from the window list. In a single-window app
// this is always the first (and only) entry.
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] ?? null
}

// ─── Status push helper ───────────────────────────────────────────────────────
function pushStatus(window: BrowserWindow, status: StreamStatus): void {
  window.webContents.send('stream:status', status)
}

function slugify(text: string): string {
  if (!text) return 'presentation'
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') || // Trim - from end of text
    'presentation'
  )
}

function compileHtml(presentation: Presentation, theme: Theme): string {
  const slidesHtml = presentation.slides
    .map((slide) => {
      const trimmedHtml = slide.html.trim()
      if (trimmedHtml.startsWith('<section')) {
        return trimmedHtml
      }
      return `<section>${slide.html}</section>`
    })
    .join('\n')

  const revealThemeName = theme.revealTheme || 'white'
  const cssTokens = theme.cssTokens || ''

  let width = 1280
  let height = 720
  if (presentation.aspectRatio === '9:16') {
    width = 720
    height = 1280
  } else if (presentation.aspectRatio === '1:1') {
    width = 960
    height = 960
  }

  // Scan and gather custom fonts
  const fontsToLoad = new Set<string>()
  const standardFonts = [
    'sans-serif', 'serif', 'monospace', 'system-ui', 'arial', 'helvetica', 
    'times new roman', 'courier new', 'georgia', 'trebuchet ms', 'verdana', 
    'geneva', 'tahoma', 'courier'
  ]

  const mainFontMatch = cssTokens.match(/--r-main-font:\s*['"]?([^,'";\s]+(?:\s+[^,'";\s]+)*)['"]?/i)
  const headingFontMatch = cssTokens.match(/--r-heading-font:\s*['"]?([^,'";\s]+(?:\s+[^,'";\s]+)*)['"]?/i)
  if (mainFontMatch && mainFontMatch[1]) fontsToLoad.add(mainFontMatch[1].trim())
  if (headingFontMatch && headingFontMatch[1]) fontsToLoad.add(headingFontMatch[1].trim())

  presentation.slides.forEach((slide) => {
    if (slide.style?.headingFont) fontsToLoad.add(slide.style.headingFont.trim())
    if (slide.style?.bodyFont) fontsToLoad.add(slide.style.bodyFont.trim())
  })

  const uniqueFontsToLoad = Array.from(fontsToLoad).filter(
    (f) => !standardFonts.includes(f.toLowerCase())
  )

  let dynamicFontLink = ''
  if (uniqueFontsToLoad.length > 0) {
    const families = uniqueFontsToLoad
      .map((f) => `family=${f.replace(/\s+/g, '+')}:wght@400;500;700;800`)
      .join('&')
    dynamicFontLink = `<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet" />`
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${presentation.title || 'Open Gamma Presentation'}</title>

    <!-- Reveal.js Core Stylesheets -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
    <!-- Reveal.js Base Theme -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/${revealThemeName}.css" id="reveal-theme" />
    ${dynamicFontLink}

    <style>
      ${theme.fontImport || ''}
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      .reveal {
        width: 100%;
        height: 100%;
      }
      ${cssTokens}
      
      /* Scale down text in slides with images */
      .reveal section.has-image h1,
      .reveal section.has-image h2 {
        font-size: 1.6em !important;
      }
      .reveal section.has-image p,
      .reveal section.has-image li {
        font-size: 0.6em !important;
        line-height: 1.25 !important;
      }
      .reveal section.has-image img {
        max-height: 200px !important;
        object-fit: contain;
        margin-top: 10px !important;
      }
    </style>
  </head>
  <body>
    <div class="reveal">
      <div class="slides">
        ${slidesHtml}
      </div>
    </div>

    <!-- Reveal.js Core Library -->
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
    <script>
      const loadedFonts = new Set(${JSON.stringify(standardFonts)});

      function ensureFontsLoaded() {
        const sections = document.querySelectorAll('.reveal .slides section');
        const fontsToLoad = new Set();

        sections.forEach(section => {
          const style = section.getAttribute('style') || '';
          const headingMatch = style.match(/--og-slide-font-heading:\\s*['"]?([^,'";\\s]+(?:\\s+[^,'";\\s]+)*)['"]?/i);
          const bodyMatch = style.match(/--og-slide-font-body:\\s*['"]?([^,'";\\s]+(?:\\s+[^,'";\\s]+)*)['"]?/i);

          if (headingMatch && headingMatch[1]) {
            const name = headingMatch[1].trim();
            if (!loadedFonts.has(name.toLowerCase())) {
              fontsToLoad.add(name);
            }
          }
          if (bodyMatch && bodyMatch[1]) {
            const name = bodyMatch[1].trim();
            if (!loadedFonts.has(name.toLowerCase())) {
              fontsToLoad.add(name);
            }
          }
        });

        if (fontsToLoad.size > 0) {
          const families = Array.from(fontsToLoad).map(name => {
            loadedFonts.add(name.toLowerCase());
            return 'family=' + name.replace(/\\s+/g, '+') + ':wght@400;500;700;800';
          });
          const url = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }
      }

      function adjustSlideFontSize(section) {
        if (!section) return;
        
        section.style.fontSize = '';

        const config = Reveal.getConfig();
        const maxHeight = config.height * 0.85;
        const maxWidth = config.width * 0.90;

        const prevDisplay = section.style.display;
        const prevVisibility = section.style.visibility;
        const prevPosition = section.style.position;

        section.style.display = 'block';
        section.style.visibility = 'hidden';
        section.style.position = 'absolute';

        let fontSize = 1.0;
        const minFontSize = 0.45;
        const step = 0.03;

        while (
          (section.scrollHeight > maxHeight || section.scrollWidth > maxWidth) && 
          fontSize > minFontSize
        ) {
          fontSize -= step;
          section.style.fontSize = fontSize + 'em';
        }

        section.style.display = prevDisplay;
        section.style.visibility = prevVisibility;
        section.style.position = prevPosition;
      }

      function adjustAllSlideFontSizes() {
        const sections = document.querySelectorAll('.reveal .slides section');
        sections.forEach(section => {
          adjustSlideFontSize(section);
        });
        Reveal.layout();
      }

      Reveal.initialize({
        hash: true,
        controls: true,
        progress: true,
        slideNumber: 'c/t',
        transition: 'fade',
        transitionSpeed: 'fast',
        width: ${width},
        height: ${height},
        margin: 0
      });

      Reveal.on('ready', () => {
        ensureFontsLoaded();
        adjustAllSlideFontSizes();
      });
    </script>
  </body>
</html>`
}

function compilePrintHtml(presentation: Presentation, theme: Theme, options: any): string {
  const slidesHtml = presentation.slides
    .map((slide) => {
      let slideContent = slide.html.trim()
      if (!slideContent.startsWith('<section')) {
        slideContent = `<section>${slideContent}</section>`
      }

      // If notes are enabled and exist, inject them in the format Reveal.js expects: <aside class="notes">
      if (options.includeSpeakerNotes && slide.notes) {
        if (!slideContent.includes('class="notes"') && !slideContent.includes("class='notes'")) {
          const lastIndex = slideContent.lastIndexOf('</section>')
          if (lastIndex !== -1) {
            slideContent =
              slideContent.substring(0, lastIndex) +
              `<aside class="notes">${slide.notes}</aside>` +
              slideContent.substring(lastIndex)
          }
        }
      }

      return slideContent
    })
    .join('\n')

  const revealThemeName = theme.revealTheme || 'white'
  const cssTokens = theme.cssTokens || ''

  // Scan and gather custom fonts
  const fontsToLoad = new Set<string>()
  const standardFonts = [
    'sans-serif', 'serif', 'monospace', 'system-ui', 'arial', 'helvetica', 
    'times new roman', 'courier new', 'georgia', 'trebuchet ms', 'verdana', 
    'geneva', 'tahoma', 'courier'
  ]

  const mainFontMatch = cssTokens.match(/--r-main-font:\s*['"]?([^,'";\s]+(?:\s+[^,'";\s]+)*)['"]?/i)
  const headingFontMatch = cssTokens.match(/--r-heading-font:\s*['"]?([^,'";\s]+(?:\s+[^,'";\s]+)*)['"]?/i)
  if (mainFontMatch && mainFontMatch[1]) fontsToLoad.add(mainFontMatch[1].trim())
  if (headingFontMatch && headingFontMatch[1]) fontsToLoad.add(headingFontMatch[1].trim())

  if (options.headingFont && options.headingFont !== 'original') fontsToLoad.add(options.headingFont.trim())
  if (options.bodyFont && options.bodyFont !== 'original') fontsToLoad.add(options.bodyFont.trim())

  presentation.slides.forEach((slide) => {
    if (slide.style?.headingFont) fontsToLoad.add(slide.style.headingFont.trim())
    if (slide.style?.bodyFont) fontsToLoad.add(slide.style.bodyFont.trim())
  })

  const uniqueFontsToLoad = Array.from(fontsToLoad).filter(
    (f) => !standardFonts.includes(f.toLowerCase())
  )

  let dynamicFontLink = ''
  if (uniqueFontsToLoad.length > 0) {
    const families = uniqueFontsToLoad
      .map((f) => `family=${f.replace(/\s+/g, '+')}:wght@400;500;700;800`)
      .join('&')
    dynamicFontLink = `<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet" />`
  }

  // Typography Overrides (Multiple Premium Fonts Loading)
  let typographyStyles = `
    .reveal pre, .reveal code {
      font-family: 'JetBrains Mono', monospace !important;
    }
    .reveal strong, .reveal .number, .reveal .stat {
      font-family: 'Space Grotesk', 'Outfit', sans-serif !important;
      font-weight: 800 !important;
    }
  `
  let extraFontsImport = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');\n`

  if (options.headingFont && options.headingFont !== 'original') {
    if (options.headingFont !== 'Inter' && options.headingFont !== 'Outfit' && options.headingFont !== 'JetBrains Mono' && options.headingFont !== 'Space Grotesk' && options.headingFont !== 'Playfair Display') {
      extraFontsImport += `@import url('https://fonts.googleapis.com/css2?family=${options.headingFont.replace(/\s+/g, '+')}:wght@700;800&display=swap');\n`
    }
    typographyStyles += `
      .reveal h1, .reveal h2, .reveal h3, .reveal .accent {
        font-family: '${options.headingFont}', sans-serif !important;
      }
    `
  } else {
    typographyStyles += `
      .reveal h1, .reveal h2, .reveal h3, .reveal .accent {
        font-family: var(--og-slide-font-heading, 'Outfit'), sans-serif !important;
      }
    `
  }
  if (options.bodyFont && options.bodyFont !== 'original') {
    if (options.bodyFont !== 'Inter' && options.bodyFont !== 'Outfit' && options.bodyFont !== 'JetBrains Mono' && options.bodyFont !== 'Space Grotesk' && options.bodyFont !== 'Playfair Display') {
      extraFontsImport += `@import url('https://fonts.googleapis.com/css2?family=${options.bodyFont.replace(/\s+/g, '+')}:wght@400;600&display=swap');\n`
    }
    typographyStyles += `
      .reveal p, .reveal li, .reveal td, .reveal th, .reveal div, .reveal span {
        font-family: '${options.bodyFont}', sans-serif !important;
      }
    `
  } else {
    typographyStyles += `
      .reveal p, .reveal li, .reveal td, .reveal th, .reveal div, .reveal span {
        font-family: var(--og-slide-font-body, 'Inter'), sans-serif !important;
      }
    `
  }

  // Preset styles (original, ink-saver, monochromatic)
  let presetStyles = ''
  if (options.preset === 'ink-saver') {
    presetStyles = `
      html, body, .reveal, .reveal .slides, .reveal section, .reveal .slide-background, .reveal .slide-background-content {
        background: #ffffff !important;
        background-color: #ffffff !important;
        background-image: none !important;
        color: #111111 !important;
      }
      .reveal h1, .reveal h2, .reveal h3, .reveal h4, .reveal p, .reveal li, .reveal td, .reveal th, .reveal span, .reveal div, .reveal strong, .reveal em {
        color: #111111 !important;
        background: none !important;
        -webkit-text-fill-color: #111111 !important;
        text-shadow: none !important;
      }
      .reveal .accent, .reveal strong, .reveal a {
        color: #0047ff !important;
        -webkit-text-fill-color: #0047ff !important;
      }
      .reveal .cta-block {
        background: #f3f4f6 !important;
        color: #111111 !important;
        border: 1px solid #e5e7eb !important;
      }
      .reveal table, .reveal th, .reveal td {
        border-color: #e5e7eb !important;
      }
    `
  } else if (options.preset === 'monochromatic') {
    presetStyles = `
      html, body, .reveal {
        filter: grayscale(100%) !important;
      }
    `
  }

  // Margin spacing
  let marginPadding = '60px'
  if (options.margins === 'none') marginPadding = '0px'
  else if (options.margins === 'small') marginPadding = '30px'
  else if (options.margins === 'medium') marginPadding = '60px'
  else if (options.margins === 'large') marginPadding = '100px'

  const marginStyles = `
    .reveal .slides > section {
      padding: ${marginPadding} !important;
      box-sizing: border-box !important;
    }
  `

  let width = 1280
  let height = 720
  if (presentation.aspectRatio === '9:16') {
    width = 720
    height = 1280
  } else if (presentation.aspectRatio === '1:1') {
    width = 960
    height = 960
  }

  const showNotesConfig = options.includeSpeakerNotes ? "'separate-page'" : 'false'
  const slideNumberConfig = options.showPageNumbers ? "'c/t'" : 'false'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${presentation.title || 'Open Gamma Presentation'}</title>

    <!-- Reveal.js Core Stylesheets -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
    <!-- Reveal.js Base Theme -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/${revealThemeName}.css" id="reveal-theme" />
    ${dynamicFontLink}

    <style>
      ${theme.fontImport || ''}
      ${extraFontsImport}
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      .reveal {
        width: 100%;
        height: 100%;
      }
      ${cssTokens}
      ${typographyStyles}
      ${presetStyles}
      ${marginStyles}

      /* Scale down text in slides with images */
      .reveal section.has-image h1,
      .reveal section.has-image h2 {
        font-size: 1.6em !important;
      }
      .reveal section.has-image p,
      .reveal section.has-image li {
        font-size: 0.6em !important;
        line-height: 1.25 !important;
      }
      .reveal section.has-image img {
        max-height: 200px !important;
        object-fit: contain;
        margin-top: 10px !important;
      }

      /* PDF print scaling and column alignment rules */
      .reveal section img {
        max-height: 50vh;
        max-width: 100%;
        object-fit: contain;
      }
      .reveal .cols {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
        gap: 30px !important;
        align-items: stretch !important;
        width: 100% !important;
        margin-top: 25px !important;
        text-align: left;
      }
      .reveal .col {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
      }
      
      /* Premium Card UI */
      .reveal .card {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 12px !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
        text-align: left !important;
        backdrop-filter: blur(12px) !important;
      }
      .reveal .card h3 {
        margin-top: 0 !important;
        margin-bottom: 12px !important;
        font-size: 1.25em !important;
        font-family: var(--og-slide-font-heading, sans-serif) !important;
        color: var(--og-slide-text, #ede9e1) !important;
      }
      .reveal .card p {
        margin: 0 !important;
        font-size: 0.9em !important;
        line-height: 1.5 !important;
        font-family: var(--og-slide-font-body, sans-serif) !important;
        color: var(--og-slide-text, #bab6ae) !important;
        opacity: 0.9 !important;
      }

      /* Statistics Display */
      .reveal .stat-block {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
        padding: 24px !important;
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        border-radius: 12px !important;
        box-sizing: border-box !important;
        backdrop-filter: blur(8px) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
      }
      .reveal .stat-number {
        font-size: 3.4em !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        color: var(--og-slide-accent, #e8ff57) !important;
        margin-bottom: 8px !important;
        text-shadow: 0 0 15px rgba(232, 255, 87, 0.15) !important;
        font-family: var(--og-slide-font-heading, sans-serif) !important;
      }
      .reveal .stat-label {
        font-size: 0.8em !important;
        font-weight: 700 !important;
        color: var(--og-slide-text, #ede9e1) !important;
        opacity: 0.8 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
        font-family: var(--og-slide-font-body, sans-serif) !important;
      }

      /* Testimonials & Pull Quotes */
      .reveal .quote-block {
        border-left: 4px solid var(--og-slide-accent, #e8ff57) !important;
        padding-left: 24px !important;
        text-align: left !important;
        margin: 30px auto !important;
        max-width: 85% !important;
        font-style: italic !important;
        box-sizing: border-box !important;
        background: rgba(255, 255, 255, 0.01) !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
        border-top-right-radius: 8px !important;
        border-bottom-right-radius: 8px !important;
      }
      .reveal .quote-text {
        font-size: 1.3em !important;
        line-height: 1.4 !important;
        font-weight: 500 !important;
        margin-bottom: 12px !important;
        color: var(--og-slide-text, #ede9e1) !important;
        font-family: var(--og-slide-font-body, sans-serif) !important;
      }
      .reveal .quote-author {
        font-size: 0.85em !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        color: var(--og-slide-muted, #9ca3af) !important;
        font-style: normal !important;
        letter-spacing: 0.08em !important;
        font-family: var(--og-slide-font-body, sans-serif) !important;
      }

      /* Pill Badges */
      .reveal .badge {
        display: inline-block !important;
        background: rgba(232, 255, 87, 0.1) !important;
        border: 1px solid rgba(232, 255, 87, 0.2) !important;
        color: var(--og-slide-accent, #e8ff57) !important;
        padding: 5px 14px !important;
        border-radius: 9999px !important;
        font-size: 0.7em !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.12em !important;
        margin-bottom: 20px !important;
        font-family: var(--og-slide-font-body, sans-serif) !important;
      }

      @media print {
        .reveal section img {
          max-height: 45vh !important;
          max-width: 100% !important;
          object-fit: contain !important;
          margin: 10px auto !important;
          display: block !important;
          box-shadow: none !important;
        }
        .reveal .cols {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
          gap: 20px !important;
          align-items: stretch !important;
          width: 100% !important;
        }
        .reveal .card {
          padding: 16px !important;
        }
        .reveal .stat-block {
          padding: 14px !important;
        }
        .reveal pre, .reveal code {
          max-height: 35vh !important;
          overflow: hidden !important;
        }
        .reveal ul, .reveal ol {
          margin-top: 12px !important;
          margin-bottom: 12px !important;
        }
        .reveal h1 {
          margin-top: 15px !important;
          margin-bottom: 15px !important;
        }
        .reveal h2 {
          margin-top: 12px !important;
          margin-bottom: 12px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="reveal">
      <div class="slides">
        ${slidesHtml}
      </div>
    </div>

    <!-- Reveal.js Core Library -->
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
    <script>
      const loadedFonts = new Set(${JSON.stringify(standardFonts)});

      function ensureFontsLoaded() {
        const sections = document.querySelectorAll('.reveal .slides section');
        const fontsToLoad = new Set();

        sections.forEach(section => {
          const style = section.getAttribute('style') || '';
          const headingMatch = style.match(/--og-slide-font-heading:\\s*['"]?([^,'";\\s]+(?:\\s+[^,'";\\s]+)*)['"]?/i);
          const bodyMatch = style.match(/--og-slide-font-body:\\s*['"]?([^,'";\\s]+(?:\\s+[^,'";\\s]+)*)['"]?/i);

          if (headingMatch && headingMatch[1]) {
            const name = headingMatch[1].trim();
            if (!loadedFonts.has(name.toLowerCase())) {
              fontsToLoad.add(name);
            }
          }
          if (bodyMatch && bodyMatch[1]) {
            const name = bodyMatch[1].trim();
            if (!loadedFonts.has(name.toLowerCase())) {
              fontsToLoad.add(name);
            }
          }
        });

        if (fontsToLoad.size > 0) {
          const families = Array.from(fontsToLoad).map(name => {
            loadedFonts.add(name.toLowerCase());
            return 'family=' + name.replace(/\\s+/g, '+') + ':wght@400;500;700;800';
          });
          const url = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }
      }

      function adjustSlideFontSize(section) {
        if (!section) return;
        
        section.style.fontSize = '';

        const config = Reveal.getConfig();
        const maxHeight = config.height * 0.85;
        const maxWidth = config.width * 0.90;

        const prevDisplay = section.style.display;
        const prevVisibility = section.style.visibility;
        const prevPosition = section.style.position;

        section.style.display = 'block';
        section.style.visibility = 'hidden';
        section.style.position = 'absolute';

        let fontSize = 1.0;
        const minFontSize = 0.45;
        const step = 0.03;

        while (
          (section.scrollHeight > maxHeight || section.scrollWidth > maxWidth) && 
          fontSize > minFontSize
        ) {
          fontSize -= step;
          section.style.fontSize = fontSize + 'em';
        }

        section.style.display = prevDisplay;
        section.style.visibility = prevVisibility;
        section.style.position = prevPosition;
      }

      function adjustAllSlideFontSizes() {
        const sections = document.querySelectorAll('.reveal .slides section');
        sections.forEach(section => {
          adjustSlideFontSize(section);
        });
        Reveal.layout();
      }

      Reveal.initialize({
        hash: false,
        controls: false,
        progress: false,
        slideNumber: ${slideNumberConfig},
        showNotes: ${showNotesConfig},
        transition: 'none',
        transitionSpeed: 'fast',
        width: ${width},
        height: ${height},
        margin: 0
      });

      Reveal.on('ready', () => {
        ensureFontsLoaded();
        adjustAllSlideFontSizes();
      });
    </script>
  </body>
</html>`
}

// ─── Handler registration ─────────────────────────────────────────────────────

export function registerIpcHandlers(): void {
  // ── GENERATE_SLIDES ─────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.GENERATE_SLIDES, async (_event, config) => {
    const window = getMainWindow()
    if (!window) return

    // Abort any previous generation that is still in flight
    activeAbortController?.abort()
    activeAbortController = new AbortController()
    const { signal } = activeAbortController

    // Guard: require an API key or CLI tool before we generate
    const store = await getStore()
    const currentSettings: AppSettings = {
      claudeApiKey: store.get('claudeApiKey', '') as string,
      geminiApiKey: store.get('geminiApiKey', '') as string,
      openaiApiKey: store.get('openaiApiKey', '') as string,
      deepseekApiKey: store.get('deepseekApiKey', '') as string,
      groqApiKey: store.get('groqApiKey', '') as string,
      defaultTheme: store.get('defaultTheme', 'midnight') as string,
      defaultSlideCount: store.get('defaultSlideCount', 8) as number,
      defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
      executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api' | 'gemini-api' | 'openai-api' | 'deepseek-api' | 'groq-api',
      selectedCliId: store.get('selectedCliId', '') as string,
      defaultSaveLocation: store.get('defaultSaveLocation', '') as string,
      includeSpeakerNotes: store.get('includeSpeakerNotes', true) as boolean,
      addReferralFooter: store.get('addReferralFooter', true) as boolean,
      onboardingComplete: store.get('onboardingComplete', false) as boolean,
      cliTemperature: store.get('cliTemperature', 0.7) as number,
      cliMaxTokens: store.get('cliMaxTokens', 2048) as number,
      cliOutputMode: store.get('cliOutputMode', 'stream') as 'stream' | 'buffered',
      cliCustomArgs: store.get('cliCustomArgs', '') as string,
      cliWorkingDir: store.get('cliWorkingDir', '') as string,
      cliEnvVars: store.get('cliEnvVars', '') as string
    }

    if (currentSettings.executionMode === 'anthropic-api' && !currentSettings.claudeApiKey.trim()) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No Claude API key configured. Add your key in Settings before generating.'
      })
      return
    }

    if (currentSettings.executionMode === 'gemini-api' && (!currentSettings.geminiApiKey || !currentSettings.geminiApiKey.trim())) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No Gemini API key configured. Add your key in Settings before generating.'
      })
      return
    }

    if (currentSettings.executionMode === 'openai-api' && (!currentSettings.openaiApiKey || !currentSettings.openaiApiKey.trim())) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No OpenAI API key configured. Add your key in Settings before generating.'
      })
      return
    }

    if (currentSettings.executionMode === 'deepseek-api' && (!currentSettings.deepseekApiKey || !currentSettings.deepseekApiKey.trim())) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No DeepSeek API key configured. Add your key in Settings before generating.'
      })
      return
    }

    if (currentSettings.executionMode === 'groq-api' && (!currentSettings.groqApiKey || !currentSettings.groqApiKey.trim())) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No Groq API key configured. Add your key in Settings before generating.'
      })
      return
    }

    if (currentSettings.executionMode === 'local-cli' && !currentSettings.selectedCliId) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'Local CLI mode selected but no agent is picked in Settings.'
      })
      return
    }

    try {
      await generatePresentation(
        config,
        currentSettings,
        (slide) => {
          if (signal.aborted) return
          window.webContents.send(IpcChannels.GENERATE_SLIDES, slide)
        },
        (status) => {
          if (signal.aborted) return
          pushStatus(window, status)
        },
        signal
      )
    } catch (err: unknown) {
      if (signal.aborted) {
        // Cancellation is expected — reset to idle, not an error
        pushStatus(window, {
          state: 'idle',
          slidesGenerated: 0,
          totalSlides: config.slideCount
        })
      } else {
        const message = err instanceof Error ? err.message : 'Unknown generation error'
        pushStatus(window, {
          state: 'error',
          slidesGenerated: 0,
          totalSlides: config.slideCount,
          errorMessage: message
        })
      }
    }
  })

  // ── REGENERATE_SLIDE ────────────────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.REGENERATE_SLIDE,
    async (_event, slideIndex: number, currentPresentation: Presentation) => {
      const store = await getStore()
      const currentSettings: AppSettings = {
        claudeApiKey: store.get('claudeApiKey', '') as string,
        geminiApiKey: store.get('geminiApiKey', '') as string,
        openaiApiKey: store.get('openaiApiKey', '') as string,
        deepseekApiKey: store.get('deepseekApiKey', '') as string,
        groqApiKey: store.get('groqApiKey', '') as string,
        defaultTheme: store.get('defaultTheme', 'midnight') as string,
        defaultSlideCount: store.get('defaultSlideCount', 8) as number,
        defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
        executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api' | 'gemini-api' | 'openai-api' | 'deepseek-api' | 'groq-api',
        selectedCliId: store.get('selectedCliId', '') as string,
        defaultSaveLocation: store.get('defaultSaveLocation', '') as string,
        includeSpeakerNotes: store.get('includeSpeakerNotes', true) as boolean,
        addReferralFooter: store.get('addReferralFooter', true) as boolean,
        onboardingComplete: store.get('onboardingComplete', false) as boolean,
        cliTemperature: store.get('cliTemperature', 0.7) as number,
        cliMaxTokens: store.get('cliMaxTokens', 2048) as number,
        cliOutputMode: store.get('cliOutputMode', 'stream') as 'stream' | 'buffered',
        cliCustomArgs: store.get('cliCustomArgs', '') as string,
        cliWorkingDir: store.get('cliWorkingDir', '') as string,
        cliEnvVars: store.get('cliEnvVars', '') as string
      }

      if (
        currentSettings.executionMode === 'anthropic-api' &&
        !currentSettings.claudeApiKey.trim()
      ) {
        throw new Error(
          'No Claude API key configured. Add your key in Settings before regenerating.'
        )
      }

      if (
        currentSettings.executionMode === 'gemini-api' &&
        (!currentSettings.geminiApiKey || !currentSettings.geminiApiKey.trim())
      ) {
        throw new Error(
          'No Gemini API key configured. Add your key in Settings before regenerating.'
        )
      }

      if (
        currentSettings.executionMode === 'openai-api' &&
        (!currentSettings.openaiApiKey || !currentSettings.openaiApiKey.trim())
      ) {
        throw new Error(
          'No OpenAI API key configured. Add your key in Settings before regenerating.'
        )
      }

      if (
        currentSettings.executionMode === 'deepseek-api' &&
        (!currentSettings.deepseekApiKey || !currentSettings.deepseekApiKey.trim())
      ) {
        throw new Error(
          'No DeepSeek API key configured. Add your key in Settings before regenerating.'
        )
      }

      if (
        currentSettings.executionMode === 'groq-api' &&
        (!currentSettings.groqApiKey || !currentSettings.groqApiKey.trim())
      ) {
        throw new Error(
          'No Groq API key configured. Add your key in Settings before regenerating.'
        )
      }

      if (currentSettings.executionMode === 'local-cli' && !currentSettings.selectedCliId) {
        throw new Error('Local CLI mode selected but no agent is picked in Settings.')
      }

      return new Promise((resolve, reject) => {
        regenerateSlide(slideIndex, currentPresentation, currentSettings, (newSlide) => {
          resolve(newSlide)
        }).catch(reject)
      })
    }
  )

  // ── CANCEL_GENERATION ───────────────────────────────────────────────────────
  // Fire-and-forget from the renderer (ipcRenderer.send, not invoke)
  ipcMain.on(IpcChannels.CANCEL_GENERATION, () => {
    activeAbortController?.abort()
    activeAbortController = null
  })

  // ── EXPORT_PPTX ─────────────────────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.EXPORT_PPTX,
    async (
      _event,
      presentation: Presentation & {
        showFolderOnly?: boolean
        filePath?: string
        exportFormat?: string
        exportOptions?: any
      }
    ) => {
      const window = getMainWindow()
      if (!window) return { success: false, error: 'Main window not found' }

      // Case 1: Highlight Folder only request (invoked via Success Toast action link click)
      if (presentation.showFolderOnly && presentation.filePath) {
        try {
          shell.showItemInFolder(presentation.filePath)
          return { success: true }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to show in folder'
          console.error('[ipc] SHOW_IN_FOLDER error:', message)
          return { success: false, error: message }
        }
      }

      // Resolve active theme matching the presentation or fallback to startup-gradient
      const themeId = presentation.theme
      const theme = themes.find((t) => t.id === themeId) || themes[0]
      const slug = slugify(presentation.title)
      const desktopPath = app.getPath('desktop')

      // Case 2: Standalone Reveal.js HTML Export
      if (presentation.exportFormat === 'html') {
        const defaultPath = join(desktopPath, `${slug}.html`)
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
          title: 'Export Standalone HTML Presentation',
          defaultPath,
          filters: [{ name: 'HTML Document', extensions: ['html'] }]
        })

        if (canceled || !filePath) return { success: false }

        try {
          const htmlContent = compileHtml(presentation, theme)
          await fs.promises.writeFile(filePath, htmlContent, 'utf-8')
          shell.showItemInFolder(filePath)
          return { success: true, path: filePath }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'HTML export failed'
          console.error('[ipc] EXPORT_HTML error:', message)
          return { success: false, error: message }
        }
      }

      // Case 3: PDF Booklet Export
      if (presentation.exportFormat === 'pdf') {
        const defaultPath = join(desktopPath, `${slug}.pdf`)
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
          title: 'Export PDF Booklet',
          defaultPath,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        })

        if (canceled || !filePath) return { success: false }

        let printWindow: BrowserWindow | null = null
        let tempHtmlPath = ''

        try {
          const exportOptions = presentation.exportOptions || {}
          const htmlContent = compilePrintHtml(presentation, theme, exportOptions)
          tempHtmlPath = join(app.getPath('temp'), `print-${presentation.id}-${Date.now()}.html`)
          await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf-8')

          let width = 1280
          let height = 720
          if (presentation.aspectRatio === '9:16') {
            width = 720
            height = 1280
          } else if (presentation.aspectRatio === '1:1') {
            width = 960
            height = 960
          }

          printWindow = new BrowserWindow({
            show: false,
            width,
            height,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          })

          await printWindow.loadURL(`file://${tempHtmlPath}?print-pdf`)

          // Give Reveal.js ample time to load libraries from CDN and perform calculations
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const pdfOptions = {
            pageSize: exportOptions.pageSize || 'A4',
            landscape: exportOptions.orientation !== 'portrait',
            printBackground: true,
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0
            }
          }

          const data = await printWindow.webContents.printToPDF(pdfOptions)
          await fs.promises.writeFile(filePath, data)

          shell.showItemInFolder(filePath)
          return { success: true, path: filePath }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'PDF export failed'
          console.error('[ipc] EXPORT_PDF error:', message)
          return { success: false, error: message }
        } finally {
          if (printWindow) {
            printWindow.destroy()
          }
          if (tempHtmlPath) {
            try {
              await fs.promises.unlink(tempHtmlPath)
            } catch (e) {
              console.error('Failed to unlink temporary HTML file:', e)
            }
          }
        }
      }

      // Case 4: PNG slideshow folder Export
      if (presentation.exportFormat === 'png') {
        const { canceled, filePaths } = await dialog.showOpenDialog(window, {
          title: 'Select Destination Folder for PNG Images',
          properties: ['openDirectory', 'createDirectory']
        })

        if (canceled || !filePaths || filePaths.length === 0) return { success: false }

        const outputFolder = filePaths[0]
        let captureWindow: BrowserWindow | null = null
        let tempHtmlPath = ''

        try {
          const exportOptions = presentation.exportOptions || {}
          const htmlContent = compilePrintHtml(presentation, theme, {
            ...exportOptions,
            includeSpeakerNotes: false
          })
          tempHtmlPath = join(app.getPath('temp'), `png-${presentation.id}-${Date.now()}.html`)
          await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf-8')

          let width = 1280
          let height = 720
          if (presentation.aspectRatio === '9:16') {
            width = 720
            height = 1280
          } else if (presentation.aspectRatio === '1:1') {
            width = 960
            height = 960
          }

          captureWindow = new BrowserWindow({
            show: false,
            width,
            height,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          })

          await captureWindow.loadURL(`file://${tempHtmlPath}`)

          // Wait for page load and styling layouts
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const slidesCount = presentation.slides.length
          for (let i = 0; i < slidesCount; i++) {
            await captureWindow.webContents.executeJavaScript(`Reveal.slide(${i});`)
            // Wait for slide transition layout stabilizing
            await new Promise((resolve) => setTimeout(resolve, 500))

            const image = await captureWindow.webContents.capturePage()
            const buffer = image.toPNG()
            const pngPath = join(outputFolder, `slide_${i + 1}.png`)
            await fs.promises.writeFile(pngPath, buffer)
          }

          shell.openPath(outputFolder)
          return { success: true, path: outputFolder }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'PNG export failed'
          console.error('[ipc] EXPORT_PNG error:', message)
          return { success: false, error: message }
        } finally {
          if (captureWindow) {
            captureWindow.destroy()
          }
          if (tempHtmlPath) {
            try {
              await fs.promises.unlink(tempHtmlPath)
            } catch (e) {
              console.error('Failed to unlink temporary HTML file:', e)
            }
          }
        }
      }

      // Case 4b: Markdown Presentation Outline Export
      if (presentation.exportFormat === 'md') {
        const defaultPath = join(desktopPath, `${slug}.md`)
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
          title: 'Export Markdown Presentation Outline',
          defaultPath,
          filters: [{ name: 'Markdown Outline', extensions: ['md'] }]
        })

        if (canceled || !filePath) return { success: false }

        try {
          let mdContent = `# ${presentation.title || 'Untitled Presentation'}\n\n`

          if (presentation.prompt) {
            mdContent += `> **Source Prompt**: ${presentation.prompt}\n\n`
          }

          mdContent += `**Theme**: ${theme.name || 'Default'}\n`
          mdContent += `**Aspect Ratio**: ${presentation.aspectRatio || '16:9'}\n\n`
          mdContent += `---\n\n`

          presentation.slides.forEach((slide, index) => {
            mdContent += `## Slide ${index + 1}: ${slide.title || 'Untitled Slide'}\n\n`

            const slideText = cleanHtmlToMarkdown(slide.html)
            if (slideText) {
              mdContent += `${slideText}\n\n`
            }

            const exportOptions = presentation.exportOptions || {}
            if (exportOptions.includeSpeakerNotes && slide.notes) {
              mdContent += `### Speaker Notes\n`
              mdContent += `> *${slide.notes.trim().replace(/\n/g, '\n> *')}*\n\n`
            }

            mdContent += `---\n\n`
          })

          await fs.promises.writeFile(filePath, mdContent.trim() + '\n', 'utf-8')
          shell.showItemInFolder(filePath)
          return { success: true, path: filePath }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Markdown export failed'
          console.error('[ipc] EXPORT_MD error:', message)
          return { success: false, error: message }
        }
      }

      // Case 4c: Raw JSON Schema Export
      if (presentation.exportFormat === 'json') {
        const defaultPath = join(desktopPath, `${slug}.json`)
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
          title: 'Export Raw JSON Presentation Schema',
          defaultPath,
          filters: [{ name: 'JSON Document', extensions: ['json'] }]
        })

        if (canceled || !filePath) return { success: false }

        try {
          const jsonSchema = {
            $schema: 'https://opengamma.app/schemas/presentation.schema.json',
            id: presentation.id,
            title: presentation.title,
            prompt: presentation.prompt,
            theme: presentation.theme,
            aspectRatio: presentation.aspectRatio,
            createdAt: presentation.createdAt,
            slides: presentation.slides.map((s) => ({
              id: s.id,
              index: s.index,
              title: s.title,
              slideType: s.slideType,
              html: s.html,
              notes: s.notes
            }))
          }

          await fs.promises.writeFile(filePath, JSON.stringify(jsonSchema, null, 2), 'utf-8')
          shell.showItemInFolder(filePath)
          return { success: true, path: filePath }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'JSON export failed'
          console.error('[ipc] EXPORT_JSON error:', message)
          return { success: false, error: message }
        }
      }

      // Case 5: PowerPoint (.pptx) Export
      const defaultPath = join(desktopPath, `${slug}.pptx`)
      const { canceled, filePath } = await dialog.showSaveDialog(window, {
        title: 'Export PowerPoint Presentation',
        defaultPath,
        filters: [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }]
      })

      if (canceled || !filePath) return { success: false }

      try {
        await exportToPptx(presentation, filePath)
        shell.showItemInFolder(filePath)
        return { success: true, path: filePath }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'PPTX export failed'
        console.error('[ipc] EXPORT_PPTX error:', message)
        return { success: false, error: message }
      }
    }
  )

  // ── SAVE_PRESENTATION ───────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.SAVE_PRESENTATION, async (_event, presentation: Presentation) => {
    try {
      db.savePresentation(presentation)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save presentation'
      console.error('[ipc] SAVE_PRESENTATION error:', message)
      throw err
    }
  })

  // ── GET_HISTORY ─────────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.GET_HISTORY, async () => {
    try {
      return db.getHistory()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve presentation history'
      console.error('[ipc] GET_HISTORY error:', message)
      throw err
    }
  })

  // ── GET_PRESENTATION_BY_ID ──────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.GET_PRESENTATION_BY_ID, async (_event, id: string) => {
    try {
      return db.getPresentationById(id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve presentation'
      console.error('[ipc] GET_PRESENTATION_BY_ID error:', message)
      throw err
    }
  })

  // ── DELETE_PRESENTATION ─────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.DELETE_PRESENTATION, async (_event, id: string) => {
    try {
      db.deletePresentation(id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete presentation'
      console.error('[ipc] DELETE_PRESENTATION error:', message)
      throw err
    }
  })

  // ── GET_SETTINGS ────────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.GET_SETTINGS, async (): Promise<AppSettings> => {
    const store = await getStore()
    return {
      claudeApiKey: store.get('claudeApiKey', '') as string,
      geminiApiKey: store.get('geminiApiKey', '') as string,
      openaiApiKey: store.get('openaiApiKey', '') as string,
      deepseekApiKey: store.get('deepseekApiKey', '') as string,
      groqApiKey: store.get('groqApiKey', '') as string,
      defaultTheme: store.get('defaultTheme', 'midnight') as string,
      defaultSlideCount: store.get('defaultSlideCount', 8) as number,
      defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
      executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api' | 'gemini-api' | 'openai-api' | 'deepseek-api' | 'groq-api',
      selectedCliId: store.get('selectedCliId', '') as string,
      defaultSaveLocation: store.get('defaultSaveLocation', '') as string,
      includeSpeakerNotes: store.get('includeSpeakerNotes', true) as boolean,
      addReferralFooter: store.get('addReferralFooter', true) as boolean,
      onboardingComplete: store.get('onboardingComplete', false) as boolean,
      cliTemperature: store.get('cliTemperature', 0.7) as number,
      cliMaxTokens: store.get('cliMaxTokens', 2048) as number,
      cliOutputMode: store.get('cliOutputMode', 'stream') as 'stream' | 'buffered',
      cliCustomArgs: store.get('cliCustomArgs', '') as string,
      cliWorkingDir: store.get('cliWorkingDir', '') as string,
      cliEnvVars: store.get('cliEnvVars', '') as string
    }
  })

  // ── SAVE_SETTINGS ───────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.SAVE_SETTINGS, async (_event, settings: AppSettings) => {
    const store = await getStore()
    store.set('claudeApiKey', settings.claudeApiKey)
    store.set('geminiApiKey', settings.geminiApiKey ?? '')
    store.set('openaiApiKey', settings.openaiApiKey ?? '')
    store.set('deepseekApiKey', settings.deepseekApiKey ?? '')
    store.set('groqApiKey', settings.groqApiKey ?? '')
    store.set('defaultTheme', settings.defaultTheme)
    store.set('defaultSlideCount', settings.defaultSlideCount)
    store.set('defaultNarrative', settings.defaultNarrative)
    store.set('executionMode', settings.executionMode)
    store.set('selectedCliId', settings.selectedCliId)
    store.set('defaultSaveLocation', settings.defaultSaveLocation ?? '')
    store.set('includeSpeakerNotes', settings.includeSpeakerNotes ?? true)
    store.set('addReferralFooter', settings.addReferralFooter ?? true)
    store.set('onboardingComplete', settings.onboardingComplete ?? false)
    store.set('cliTemperature', settings.cliTemperature ?? 0.7)
    store.set('cliMaxTokens', settings.cliMaxTokens ?? 2048)
    store.set('cliOutputMode', settings.cliOutputMode ?? 'stream')
    store.set('cliCustomArgs', settings.cliCustomArgs ?? '')
    store.set('cliWorkingDir', settings.cliWorkingDir ?? '')
    store.set('cliEnvVars', settings.cliEnvVars ?? '')
  })

  // ── OPEN_FILE_DIALOG ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.OPEN_FILE_DIALOG, async (_event, options) => {
    const window = getMainWindow()
    if (!window) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(window, options ?? {})
  })

  // ── SCAN_CLIS ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.SCAN_CLIS, async (): Promise<DetectedCLI[]> => {
    try {
      const { scanInstalledCLIs } = await import('./cliScanner')
      return await scanInstalledCLIs()
    } catch (err: unknown) {
      console.error('[ipc] SCAN_CLIS error:', err)
      return []
    }
  })

  // ── RESCAN_CLIS ──────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.RESCAN_CLIS, async (): Promise<DetectedCLI[]> => {
    try {
      const { rescanCLIs } = await import('./cliScanner')
      return await rescanCLIs()
    } catch (err: unknown) {
      console.error('[ipc] RESCAN_CLIS error:', err)
      return []
    }
  })

  // ── GET_APP_INFO ──────────────────────────────────────────────────────
  ipcMain.handle('app:get-info', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    }
  })

  // ── TEST_API_KEY ────────────────────────────────────────────────────────────
  // Simple validation that the API key has the expected format.
  // A real implementation would call the Anthropic API to verify the key works.
  ipcMain.handle(IpcChannels.TEST_API_KEY, async (_event, apiKey: string) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'API key is empty' }
    }

    const trimmed = apiKey.trim()

    // Basic format validation: Anthropic API keys start with 'sk-ant-' and are at least 30 chars
    if (!trimmed.startsWith('sk-ant-')) {
      return { valid: false, message: 'API key must start with sk-ant-' }
    }

    if (trimmed.length < 30) {
      return { valid: false, message: 'API key appears too short' }
    }

    // TODO: In a future session, make an actual API call to verify the key:
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': trimmed,
    //     'anthropic-version': '2023-06-01',
    //     'content-type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-3-5-sonnet-20241022',
    //     max_tokens: 10,
    //     messages: [{ role: 'user', content: 'test' }]
    //   })
    // })
    // const valid = response.status === 200

    return { valid: true, message: 'API key format is valid' }
  })

  // ── TEST_GEMINI_API_KEY ─────────────────────────────────────────────────────
  // Simple validation that the Gemini API key has the expected format.
  // A real implementation would call the Google Gemini API to verify it.
  ipcMain.handle(IpcChannels.TEST_GEMINI_API_KEY, async (_event, apiKey: string) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'API key is empty' }
    }

    const trimmed = apiKey.trim()

    // Basic format validation: Gemini API keys usually start with 'AIzaSy' and are at least 30 chars
    if (!trimmed.startsWith('AIzaSy')) {
      return { valid: false, message: 'API key must start with AIzaSy' }
    }

    if (trimmed.length < 35) {
      return { valid: false, message: 'API key appears too short' }
    }

    return { valid: true, message: 'API key format is valid' }
  })

  // ── TEST_OPENAI_API_KEY ─────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.TEST_OPENAI_API_KEY, async (_event, apiKey: string) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'API key is empty' }
    }
    const trimmed = apiKey.trim()
    if (!trimmed.startsWith('sk-proj-') && !trimmed.startsWith('sk-')) {
      return { valid: false, message: 'API key must start with sk-' }
    }
    if (trimmed.length < 20) {
      return { valid: false, message: 'API key appears too short' }
    }
    return { valid: true, message: 'API key format is valid' }
  })

  // ── TEST_DEEPSEEK_API_KEY ───────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.TEST_DEEPSEEK_API_KEY, async (_event, apiKey: string) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'API key is empty' }
    }
    const trimmed = apiKey.trim()
    if (!trimmed.startsWith('sk-')) {
      return { valid: false, message: 'API key must start with sk-' }
    }
    if (trimmed.length < 20) {
      return { valid: false, message: 'API key appears too short' }
    }
    return { valid: true, message: 'API key format is valid' }
  })

  // ── TEST_GROQ_API_KEY ───────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.TEST_GROQ_API_KEY, async (_event, apiKey: string) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'API key is empty' }
    }
    const trimmed = apiKey.trim()
    if (!trimmed.startsWith('gsk_')) {
      return { valid: false, message: 'API key must start with gsk_' }
    }
    if (trimmed.length < 20) {
      return { valid: false, message: 'API key appears too short' }
    }
    return { valid: true, message: 'API key format is valid' }
  })

  // ── TEST_CLI_TOOL ───────────────────────────────────────────────────────────
  // Test if a detected CLI tool is accessible and returns version info
  ipcMain.handle(IpcChannels.TEST_CLI_TOOL, async (_event, cliPath: string, cliName: string) => {
    if (!cliPath || typeof cliPath !== 'string') {
      return { success: false, message: 'CLI path is empty', version: undefined }
    }

    try {
      // Check if the binary is executable/accessible (X_OK is not supported on Windows)
      const isWin = process.platform === 'win32'
      await fs.promises.access(cliPath, isWin ? fs.constants.F_OK : fs.constants.X_OK)

      // Try to get version info
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        const result = await execAsync(`"${cliPath}" --version`, { timeout: 800 })
        const version = (result.stdout || result.stderr || '').trim().split('\n')[0]
        return {
          success: true,
          message: `${cliName} is accessible`,
          version: version || undefined
        }
      } catch (_e) {
        // Version query failed, but binary is still accessible
        return {
          success: true,
          message: `${cliName} is accessible (version unknown)`,
          version: undefined
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'CLI tool is not accessible or not executable'
      return { success: false, message, version: undefined }
    }
  })

  // ── GENERATE_VOICEOVERS ─────────────────────────────────────────────────────
  ipcMain.handle('generate-voiceovers', async (_event, presentation: Presentation) => {
    const window = getMainWindow()
    if (!window) return { success: false, error: 'Window not found' }

    try {
      // 1. Send initial progress status
      window.webContents.send('voiceover-progress', {
        state: 'generating',
        current: 0,
        total: presentation.slides.length
      })

      // 2. Initialize KokoroTTS
      const { KokoroTTS } = await import('kokoro-js')
      const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device: 'cpu'
      })

      // 3. Create persistent voiceovers directory inside userData folder
      const path = require('path')
      const fs = require('fs')
      const outputDir = path.join(app.getPath('userData'), 'voiceovers', presentation.id)
      await fs.promises.mkdir(outputDir, { recursive: true })

      const audioMap: Record<number, string> = {}

      // 4. Generate audio per slide
      for (let i = 0; i < presentation.slides.length; i++) {
        const slide = presentation.slides[i]
        
        // Notify progress for this slide
        window.webContents.send('voiceover-progress', {
          state: 'generating',
          current: i + 1,
          total: presentation.slides.length
        })

        // Clean notes if any (e.g. strip HTML tags)
        const cleanNotes = (slide.notes || '').replace(/<[^>]*>/g, '').trim()

        if (cleanNotes) {
          const audio = await tts.generate(cleanNotes, {
            voice: 'af_heart'
          })

          // Save to WAV file
          const wavPath = path.join(outputDir, `og-slide-${slide.id}.wav`)
          await audio.save(wavPath)

          // Map local file url — use og-audio://localhost<abs-path> so the
          // protocol handler in index.ts can strip the origin and serve the file.
          const url = `og-audio://localhost${wavPath}`
          audioMap[slide.index] = url
          slide.voiceoverUrl = url
        } else {
          slide.voiceoverUrl = undefined
        }
      }

      // Save presentation with updated voiceoverUrls persistently to database
      db.savePresentation(presentation)

      // 5. Done
      window.webContents.send('voiceover-progress', {
        state: 'done',
        current: presentation.slides.length,
        total: presentation.slides.length
      })

      window.webContents.send('audio-map-ready', audioMap)

      return { success: true, audioMap, presentation }

    } catch (err: any) {
      console.error('[ipc] generate-voiceovers error:', err)
      window.webContents.send('voiceover-progress', {
        state: 'error',
        current: 0,
        total: presentation.slides.length,
        error: err.message || String(err)
      })
      return { success: false, error: err.message || String(err) }
    }
  })
}

/**
 * Clean up HTML formatting tags to produce a clean Markdown representation
 * for presentation outlines and slide text content.
 */
function cleanHtmlToMarkdown(html: string): string {
  if (!html) return ''

  let md = html

  // 1. Replace blockquotes
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    return '\n> ' + content.trim().replace(/\n/g, '\n> ') + '\n'
  })

  // 2. Replace headers
  md = md.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, content) => {
    return `\n### ${content.replace(/<[^>]*>/g, '').trim()}\n`
  })

  // 3. Replace list items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    return `* ${content.replace(/<[^>]*>/g, '').trim()}\n`
  })

  // 4. Replace paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    return `\n${content.replace(/<[^>]*>/g, '').trim()}\n`
  })

  // 5. Replace line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // 6. Strip any other HTML tags
  md = md.replace(/<[^>]*>/g, '')

  // 7. Clean up multiple empty lines
  md = md.replace(/\n{3,}/g, '\n\n')

  return md.trim()
}
