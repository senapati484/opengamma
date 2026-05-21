import { contextBridge, ipcRenderer } from 'electron'
import type {
  Slide,
  Presentation,
  StreamStatus,
  GenerationConfig,
  AppSettings
} from '../renderer/src/types'
import { IpcChannels } from '../main/types'

// ─── ElectronAPI surface type ─────────────────────────────────────────────────
// Kept here so the preload and the renderer's env.d.ts both reference the same
// shape. The renderer must import it only from its own env.d.ts declaration.

export interface ElectronAPI {
  // ── Generation ──────────────────────────────────────────────────────────────
  /** Kick off a streaming generation run. Slides arrive via onSlideGenerated. */
  generateSlides: (config: GenerationConfig) => Promise<void>
  /** Subscribe to individual slide events streamed from the main process.
   *  Returns a cleanup function — call it on component unmount. */
  onSlideGenerated: (callback: (slide: Slide) => void) => () => void
  /** Subscribe to overall stream lifecycle updates (idle / generating / done / error).
   *  Returns a cleanup function — call it on component unmount. */
  onStreamStatus: (callback: (status: StreamStatus) => void) => () => void
  /** Abort the currently active generation stream. */
  cancelGeneration: () => void

  // ── Export ──────────────────────────────────────────────────────────────────
  /** Serialize a presentation to .pptx and save it to disk via a save dialog. */
  exportPptx: (presentation: Presentation) => Promise<{ success: boolean; path?: string }>

  // ── Persistence ─────────────────────────────────────────────────────────────
  /** Persist a completed presentation to the local SQLite database. */
  savePresentation: (presentation: Presentation) => Promise<void>
  /** Retrieve all saved presentations from SQLite, newest first. */
  getHistory: () => Promise<Presentation[]>
  /** Remove a presentation record from SQLite by its id. */
  deletePresentation: (id: string) => Promise<void>

  // ── Settings ────────────────────────────────────────────────────────────────
  /** Read the current app settings from electron-store. */
  getSettings: () => Promise<AppSettings>
  /** Persist updated app settings to electron-store. */
  saveSettings: (settings: AppSettings) => Promise<void>
}

// ─── Implementation ───────────────────────────────────────────────────────────
// ipcRenderer is NEVER forwarded directly — only narrow, named wrappers cross
// the context bridge boundary. This prevents the renderer from calling any
// arbitrary channel.

const electronAPI: ElectronAPI = {
  // ── Generation ──────────────────────────────────────────────────────────────

  generateSlides: (config) => ipcRenderer.invoke(IpcChannels.GENERATE_SLIDES, config),

  onSlideGenerated: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, slide: Slide): void => callback(slide)
    ipcRenderer.on(IpcChannels.GENERATE_SLIDES, handler)
    // Return a cleanup function so callers can remove the listener on unmount
    return () => ipcRenderer.removeListener(IpcChannels.GENERATE_SLIDES, handler)
  },

  onStreamStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: StreamStatus): void =>
      callback(status)
    ipcRenderer.on('stream:status', handler)
    return () => ipcRenderer.removeListener('stream:status', handler)
  },

  cancelGeneration: () => {
    ipcRenderer.send(IpcChannels.CANCEL_GENERATION)
  },

  // ── Export ──────────────────────────────────────────────────────────────────

  exportPptx: (presentation) => ipcRenderer.invoke(IpcChannels.EXPORT_PPTX, presentation),

  // ── Persistence ─────────────────────────────────────────────────────────────

  savePresentation: (presentation) =>
    ipcRenderer.invoke(IpcChannels.SAVE_PRESENTATION, presentation),

  getHistory: () => ipcRenderer.invoke(IpcChannels.GET_HISTORY),

  deletePresentation: (id) => ipcRenderer.invoke(IpcChannels.DELETE_PRESENTATION, id),

  // ── Settings ────────────────────────────────────────────────────────────────

  getSettings: () => ipcRenderer.invoke(IpcChannels.GET_SETTINGS),

  saveSettings: (settings) => ipcRenderer.invoke(IpcChannels.SAVE_SETTINGS, settings)
}

// ─── Context Bridge Exposure ──────────────────────────────────────────────────
// contextIsolation must be true (enforced in main/index.ts) for this to work.
// The try/catch guards against the unlikely case of a preload running outside
// of a contextIsolated BrowserWindow during testing.

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error('[preload] contextBridge.exposeInMainWorld failed:', error)
  }
} else {
  // Fallback for non-isolated environments (e.g. unit test runners)
  ;(window as any).electronAPI = electronAPI
}
