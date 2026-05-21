import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { IpcChannels } from './types'
import type { Presentation, AppSettings, StreamStatus } from '../renderer/src/types'
import { join } from 'path'
import * as fs from 'fs'
import { themes } from '../renderer/src/lib/themes'

// ─── Stub imports (filled in later sessions) ──────────────────────────────────
// These modules will be implemented in their own files; referenced here as
// typed stubs so the IPC layer compiles and the full shape is clear upfront.
import { generatePresentation } from './generator'
import { exportToPptx } from './exporter'
import * as db from './db'

// ─── electron-store (ESM-only v11 — loaded via dynamic import) ───────────────
// We initialise the store once and cache the reference for all handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _store: any = null

async function getStore(): Promise<{
  get: (key: string, defaultValue?: unknown) => unknown
  set: (key: string, value: unknown) => void
}> {
  if (_store) return _store
  // Dynamic import required because electron-store v11+ is ESM-only
  const { default: Store } = await import('electron-store')
  _store = new Store({
    name: 'opengamma-settings',
    // Encrypt the API key at rest on disk
    encryptionKey: 'og-settings-enc-key',
    defaults: {
      claudeApiKey: '',
      defaultTheme: 'midnight',
      defaultSlideCount: 8,
      defaultNarrative: 'explainer'
    } satisfies AppSettings
  })
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
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') || // Trim - from end of text
    'presentation'
  )
}

function compileHtml(presentation: Presentation, theme: any): string {
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

    // Guard: require an API key before we touch the network
    const store = await getStore()
    const apiKey = store.get('claudeApiKey', '') as string
    if (!apiKey.trim()) {
      pushStatus(window, {
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount ?? 0,
        errorMessage: 'No Claude API key configured. Add your key in Settings before generating.'
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
      // generatePresentation streams individual slides via the onSlide callback.
      // This function is stubbed in generator.ts and will be implemented in
      // Session 03 with the actual Anthropic SDK streaming call.
      await generatePresentation(config, apiKey, signal, (slide) => {
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
      defaultNarrative: store.get('defaultNarrative', 'explainer') as string
    }
  })

  // ── SAVE_SETTINGS ───────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.SAVE_SETTINGS, async (_event, settings: AppSettings) => {
    const store = await getStore()
    store.set('claudeApiKey', settings.claudeApiKey)
    store.set('defaultTheme', settings.defaultTheme)
    store.set('defaultSlideCount', settings.defaultSlideCount)
    store.set('defaultNarrative', settings.defaultNarrative)
  })

  // ── OPEN_FILE_DIALOG ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannels.OPEN_FILE_DIALOG, async (_event, options) => {
    const window = getMainWindow()
    if (!window) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(window, options ?? {})
  })
}
