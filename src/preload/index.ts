import { contextBridge, ipcRenderer } from 'electron'
import type {
  Slide,
  Presentation,
  StreamStatus,
  GenerationConfig,
  AppSettings,
  DetectedCLI
} from '../renderer/src/types'
import { IpcChannels } from '../main/types'

export interface ElectronAPI {
  // ── Generation ──────────────────────────────────────────────────────────────
  generateSlides: (config: GenerationConfig) => Promise<void>
  /** Regenerate only one slide in isolation */
  regenerateSlide: (slideIndex: number, currentPresentation: Presentation) => Promise<Slide>
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
  savePresentation: (presentation: Presentation) => Promise<void>
  getHistory: () => Promise<Presentation[]>
  getPresentationById: (id: string) => Promise<Presentation | null>
  deletePresentation: (id: string) => Promise<void>

  // ── Settings ────────────────────────────────────────────────────────────────
  /** Read the current app settings from electron-store. */
  getSettings: () => Promise<AppSettings>
  /** Persist updated app settings to electron-store. */
  saveSettings: (settings: AppSettings) => Promise<void>
  /** Open a native folder or file selection dialog. */
  openFileDialog: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>

  // ── CLI Tools ───────────────────────────────────────────────────────────────
  scanCLIs: () => Promise<DetectedCLI[]>
  rescanCLIs: () => Promise<DetectedCLI[]>

  // ── API Key Validation ──────────────────────────────────────────────────────
  /** Test if a Claude API key is valid */
  testApiKey: (apiKey: string) => Promise<{ valid: boolean; message: string }>

  // ── CLI Tool Validation ─────────────────────────────────────────────────────
  /** Test if a CLI tool is accessible */
  testCliTool: (cliPath: string, cliName: string) => Promise<{ success: boolean; message: string; version?: string }>

  // ── Native Menu ─────────────────────────────────────────────────────────────
  /** Subscribe to native application-menu command events sent from the main
   *  process (e.g. File > New, File > Export).  Returns a cleanup function. */
  onMenuAction: (callback: (action: string) => void) => () => void

  // ── Auto Update ─────────────────────────────────────────────────────────────
  /** Subscribe to auto-update ready event sent from main process when update is downloaded. */
  onUpdateReady: (callback: () => void) => () => void
  /** Request the main process to restart and install the downloaded update. */
  restartAndInstall: () => void

  /** Get application metadata */
  getAppInfo: () => Promise<{ version: string; platform: string; arch: string }>
}

const electronAPI: ElectronAPI = {
  // ── Generation ──────────────────────────────────────────────────────────────
  generateSlides: (config) => ipcRenderer.invoke(IpcChannels.GENERATE_SLIDES, config),

  regenerateSlide: (slideIndex, currentPresentation) =>
    ipcRenderer.invoke(IpcChannels.REGENERATE_SLIDE, slideIndex, currentPresentation),

  onSlideGenerated: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, slide: Slide): void => callback(slide)
    ipcRenderer.on(IpcChannels.GENERATE_SLIDES, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannels.GENERATE_SLIDES, handler)
    }
  },

  onStreamStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: StreamStatus): void =>
      callback(status)
    ipcRenderer.on('stream:status', handler)
    return () => {
      ipcRenderer.removeListener('stream:status', handler)
    }
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

  getPresentationById: (id) => ipcRenderer.invoke(IpcChannels.GET_PRESENTATION_BY_ID, id),

  deletePresentation: (id) => ipcRenderer.invoke(IpcChannels.DELETE_PRESENTATION, id),

  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke(IpcChannels.GET_SETTINGS),

  saveSettings: (settings) => ipcRenderer.invoke(IpcChannels.SAVE_SETTINGS, settings),

  openFileDialog: (options) => ipcRenderer.invoke(IpcChannels.OPEN_FILE_DIALOG, options),

  // ── CLI Tools ───────────────────────────────────────────────────────────────
  scanCLIs: () => ipcRenderer.invoke(IpcChannels.SCAN_CLIS),
  rescanCLIs: () => ipcRenderer.invoke(IpcChannels.RESCAN_CLIS),

  // ── API Key Validation ──────────────────────────────────────────────────────
  testApiKey: (apiKey: string) =>
    ipcRenderer.invoke(IpcChannels.TEST_API_KEY, apiKey),

  // ── CLI Tool Validation ─────────────────────────────────────────────────────
  testCliTool: (cliPath: string, cliName: string) =>
    ipcRenderer.invoke(IpcChannels.TEST_CLI_TOOL, cliPath, cliName),

  // ── Native Menu ─────────────────────────────────────────────────────────────
  onMenuAction: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string): void => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => {
      ipcRenderer.removeListener('menu:action', handler)
    }
  },

  // ── Auto Update ─────────────────────────────────────────────────────────────
  onUpdateReady: (callback) => {
    const handler = (): void => callback()
    ipcRenderer.on('update-ready', handler)
    return () => {
      ipcRenderer.removeListener('update-ready', handler)
    }
  },

  restartAndInstall: () => {
    ipcRenderer.send('updater:restart')
  },

  getAppInfo: () => ipcRenderer.invoke('app:get-info')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error('[preload] contextBridge.exposeInMainWorld failed:', error)
  }
} else {
  ;(window as any).electronAPI = electronAPI
}
