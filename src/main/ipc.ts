import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { IpcChannels } from './types'
import type { Presentation, AppSettings, StreamStatus, Theme, DetectedCLI } from '../renderer/src/types'
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

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${presentation.title || 'OpenGamma Presentation'}</title>

    <!-- Reveal.js Core Stylesheets -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
    <!-- Reveal.js Base Theme -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/${revealThemeName}.css" id="reveal-theme" />

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
      Reveal.initialize({
        hash: true,
        controls: true,
        progress: true,
        slideNumber: 'c/t',
        transition: 'fade',
        transitionSpeed: 'fast',
        width: 1280,
        height: 720,
        margin: 0
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
      defaultTheme: store.get('defaultTheme', 'midnight') as string,
      defaultSlideCount: store.get('defaultSlideCount', 8) as number,
      defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
      executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api',
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

    if (currentSettings.executionMode === 'local-cli' && !currentSettings.selectedCliId) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'Local CLI mode selected but no agent is picked in Settings.'
      })
      return
    }

    // Notify the renderer that generation is starting
    pushStatus(window, {
      state: 'generating',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      await generatePresentation(config, currentSettings, signal, (slide) => {
        if (signal.aborted) return
        // Push each slide to the renderer as it arrives
        window.webContents.send(IpcChannels.GENERATE_SLIDES, slide)
        // Update the progress counter
        pushStatus(window, {
          state: 'generating',
          slidesGenerated: slide.index + 1,
          totalSlides: config.slideCount
        })
      })

      if (!signal.aborted) {
        pushStatus(window, {
          state: 'done',
          slidesGenerated: config.slideCount,
          totalSlides: config.slideCount
        })
      }
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
        defaultTheme: store.get('defaultTheme', 'midnight') as string,
        defaultSlideCount: store.get('defaultSlideCount', 8) as number,
        defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
        executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api',
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
        throw new Error('No Claude API key configured. Add your key in Settings before regenerating.')
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

      // Case 3: PowerPoint (.pptx) Export
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
      defaultTheme: store.get('defaultTheme', 'midnight') as string,
      defaultSlideCount: store.get('defaultSlideCount', 8) as number,
      defaultNarrative: store.get('defaultNarrative', 'explainer') as string,
      executionMode: store.get('executionMode', 'local-cli') as 'local-cli' | 'anthropic-api',
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

  // ── TEST_CLI_TOOL ───────────────────────────────────────────────────────────
  // Test if a detected CLI tool is accessible and returns version info
  ipcMain.handle(IpcChannels.TEST_CLI_TOOL, async (_event, cliPath: string, cliName: string) => {
    if (!cliPath || typeof cliPath !== 'string') {
      return { success: false, message: 'CLI path is empty', version: undefined }
    }

    try {
      // Check if the binary is executable
      await fs.promises.access(cliPath, fs.constants.X_OK)

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
}

