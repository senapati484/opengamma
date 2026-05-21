// ─── Ambient Window Extension ─────────────────────────────────────────────────
// This file is a TypeScript ambient declaration — it is picked up automatically
// by the renderer's tsconfig (no import required anywhere in the codebase).
//
// It extends the global Window interface so that every renderer component can
// access window.electronAPI with full type-safety without importing from the
// preload directly (which would break the process boundary).

import type { Slide, Presentation, StreamStatus, GenerationConfig, AppSettings } from './types'

// Re-declare (not re-export) the ElectronAPI interface here so this file is
// self-contained. It must stay byte-for-byte identical to the interface in
// src/preload/index.ts — the preload is the source of truth, this is the mirror.
interface ElectronAPI {
  // ── Generation ──────────────────────────────────────────────────────────────

  /** Kick off a streaming generation run. Individual slides arrive via
   *  onSlideGenerated events as the stream progresses. */
  generateSlides(config: GenerationConfig): Promise<void>

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

  /** Permanently remove a presentation record from SQLite. */
  deletePresentation(id: string): Promise<void>

  // ── Settings ────────────────────────────────────────────────────────────────

  /** Read the current app settings from electron-store. */
  getSettings(): Promise<AppSettings>

  /** Persist updated app settings to electron-store. */
  saveSettings(settings: AppSettings): Promise<void>
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
