import type { Slide, Presentation, StreamStatus, GenerationConfig, AppSettings } from '../types'

// ─── ElectronAPI type (re-used from the ambient declaration) ──────────────────
// Pull the type off the global Window so this hook stays in sync with
// electron.d.ts automatically — no duplicated interface to maintain.
type ElectronAPI = Window['electronAPI']

// ─── Browser / Storybook mock ─────────────────────────────────────────────────
// When the renderer runs outside Electron (Storybook, plain browser, unit
// tests) window.electronAPI is undefined. The mock below satisfies the full
// interface with no-op implementations so components render without crashing.
// Methods that return data resolve with sensible empty defaults.

const noop = (): void => {}
const noopCleanup = (): (() => void) => noop

const browserMock: ElectronAPI = {
  // ── Generation ──────────────────────────────────────────────────────────────
  generateSlides: async (_config: GenerationConfig): Promise<void> => {
    console.warn('[useElectron] generateSlides called outside Electron — no-op')
  },

  onSlideGenerated: (_callback: (slide: Slide) => void): (() => void) => {
    console.warn('[useElectron] onSlideGenerated registered outside Electron — no-op')
    return noopCleanup()
  },

  onStreamStatus: (_callback: (status: StreamStatus) => void): (() => void) => {
    console.warn('[useElectron] onStreamStatus registered outside Electron — no-op')
    return noopCleanup()
  },

  cancelGeneration: (): void => {
    console.warn('[useElectron] cancelGeneration called outside Electron — no-op')
  },

  // ── Export ──────────────────────────────────────────────────────────────────
  exportPptx: async (_presentation: Presentation): Promise<{ success: boolean; path?: string }> => {
    console.warn('[useElectron] exportPptx called outside Electron — returning mock success')
    return { success: false }
  },

  // ── Persistence ─────────────────────────────────────────────────────────────
  savePresentation: async (_presentation: Presentation): Promise<void> => {
    console.warn('[useElectron] savePresentation called outside Electron — no-op')
  },

  getHistory: async (): Promise<Presentation[]> => {
    console.warn('[useElectron] getHistory called outside Electron — returning []')
    return []
  },

  deletePresentation: async (_id: string): Promise<void> => {
    console.warn('[useElectron] deletePresentation called outside Electron — no-op')
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings: async (): Promise<AppSettings> => {
    console.warn('[useElectron] getSettings called outside Electron — returning defaults')
    return {
      claudeApiKey: '',
      defaultTheme: 'midnight',
      defaultSlideCount: 8,
      defaultNarrative: 'explainer'
    }
  },

  saveSettings: async (_settings: AppSettings): Promise<void> => {
    console.warn('[useElectron] saveSettings called outside Electron — no-op')
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the `window.electronAPI` surface injected by the preload script.
 *
 * When running outside Electron (browser, Storybook, unit tests) it returns a
 * safe no-op mock so components can render and be tested without crashing.
 *
 * Usage:
 * ```ts
 * const api = useElectron()
 * await api.generateSlides(config)
 * ```
 */
export function useElectron(): ElectronAPI {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI
  }
  return browserMock
}
