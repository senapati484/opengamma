// ─── Ambient Window Extension ─────────────────────────────────────────────────
// This file is a TypeScript ambient declaration — it is picked up automatically
// by the renderer's tsconfig (no import required anywhere in the codebase).
//
// It extends the global Window interface so that every renderer component can
// access window.electronAPI with full type-safety without importing from the
// preload directly (which would break the process boundary).

import type {
  Slide,
  Presentation,
  StreamStatus,
  GenerationConfig,
  AppSettings,
  DetectedCLI
} from './types'

// Re-declare (not re-export) the ElectronAPI interface here so this file is
// self-contained. It must stay byte-for-byte identical to the interface in
// src/preload/index.ts — the preload is the source of truth, this is the mirror.
interface ElectronAPI {
  // ── Generation ──────────────────────────────────────────────────────────────

  /** Kick off a streaming generation run. Individual slides arrive via
   *  onSlideGenerated events as the stream progresses. */
  generateSlides(config: GenerationConfig): Promise<void>

  /** Regenerate only one slide in isolation */
  regenerateSlide(slideIndex: number, currentPresentation: Presentation): Promise<Slide>

  /** Subscribe to individual slide push events from the main process.
   *  @returns A cleanup function — call it from useEffect's return. */
  onSlideGenerated(callback: (slide: Slide) => void): () => void

  /** Subscribe to stream lifecycle status updates.
   *  @returns A cleanup function — call it from useEffect's return. */
  onStreamStatus(callback: (status: StreamStatus) => void): () => void

  /** Abort the currently active generation stream immediately. */
  cancelGeneration(): void

  // ── Export ──────────────────────────────────────────────────────────────────

  /** Open a native Save dialog and write the presentation to a .pptx file. */
  exportPptx(presentation: Presentation): Promise<{ success: boolean; path?: string }>

  // ── Persistence ─────────────────────────────────────────────────────────────

  /** Persist a completed presentation to the local SQLite database. */
  savePresentation(presentation: Presentation): Promise<void>

  /** Retrieve all saved presentations from SQLite, ordered newest first. */
  getHistory(): Promise<Presentation[]>

  /** Retrieve a single presentation from SQLite by its ID. */
  getPresentationById(id: string): Promise<Presentation | null>

  /** Permanently remove a presentation record from SQLite. */
  deletePresentation(id: string): Promise<void>

  // ── Settings ────────────────────────────────────────────────────────────────

  /** Read the current app settings from electron-store. */
  getSettings(): Promise<AppSettings>

  /** Persist updated app settings to electron-store. */
  saveSettings(settings: AppSettings): Promise<void>

  /** Open a native folder or file selection dialog. */
  openFileDialog(options?: any): Promise<{ canceled: boolean; filePaths: string[] }>

  // ── CLI Tools ───────────────────────────────────────────────────────────────

  scanCLIs(): Promise<DetectedCLI[]>
  rescanCLIs(): Promise<DetectedCLI[]>

  // ── API Key Validation ──────────────────────────────────────────────────────

  /** Test if a Claude API key is valid */
  testApiKey(apiKey: string): Promise<{ valid: boolean; message: string }>
  /** Test if a Gemini API key is valid */
  testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; message: string }>
  // ── CLI Tool Validation ────────────────────────────────────────────────────

  /** Test if a CLI tool is accessible */
  testCliTool(
    cliPath: string,
    cliName: string
  ): Promise<{ success: boolean; message: string; version?: string }>
  // ── Native Menu ─────────────────────────────────────────────────────────────

  /** Subscribe to native application-menu command events sent from the main
   *  process (e.g. File > New, File > Export). Returns a cleanup function. */
  onMenuAction(callback: (action: string) => void): () => void

  // ── Auto Update ─────────────────────────────────────────────────────────────

  /** Subscribe to auto-update ready event sent from main process when update is downloaded. */
  onUpdateReady(callback: () => void): () => void

  /** Request the main process to restart and install the downloaded update. */
  restartAndInstall(): void

  getAppInfo(): Promise<{ version: string; platform: string; arch: string }>

  // ── Voiceover TTS ────────────────────────────────────────────────────────────
  generateVoiceovers(
    presentation: Presentation
  ): Promise<{ success: boolean; audioMap?: Record<number, string>; presentation?: Presentation; error?: string }>
  onVoiceoverProgress(
    callback: (progress: {
      state: 'generating' | 'done' | 'error'
      current: number
      total: number
      error?: string
    }) => void
  ): () => void
  onAudioMapReady(callback: (audioMap: Record<number, string>) => void): () => void
}

declare global {
  interface Window {
    /** Injected by the preload script via contextBridge.exposeInMainWorld.
     *  Always present inside Electron; undefined in plain browser/Storybook. */
    electronAPI: ElectronAPI
    /** Provided by default electron-toolkit preload utilities */
    electron: {
      process: {
        versions: {
          electron: string
          chrome: string
          node: string
        }
      }
    }
  }
}
