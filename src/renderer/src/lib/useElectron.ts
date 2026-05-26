import type {
  Slide,
  Presentation,
  StreamStatus,
  GenerationConfig,
  AppSettings,
  DetectedCLI
} from '../types'

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
  generateSlides: async (config: GenerationConfig): Promise<void> => {
    console.warn('[useElectron] generateSlides called outside Electron with config:', config)
  },

  onSlideGenerated: (callback: (slide: Slide) => void): (() => void) => {
    console.warn(
      '[useElectron] onSlideGenerated registered outside Electron with callback:',
      callback
    )
    return noopCleanup()
  },

  onStreamStatus: (callback: (status: StreamStatus) => void): (() => void) => {
    console.warn(
      '[useElectron] onStreamStatus registered outside Electron with callback:',
      callback
    )
    return noopCleanup()
  },

  cancelGeneration: (): void => {
    console.warn('[useElectron] cancelGeneration called outside Electron — no-op')
  },

  // ── Export ──────────────────────────────────────────────────────────────────
  exportPptx: async (presentation: Presentation): Promise<{ success: boolean; path?: string }> => {
    console.warn('[useElectron] exportPptx called outside Electron for presentation:', presentation)
    return { success: false }
  },

  // ── Persistence ─────────────────────────────────────────────────────────────
  savePresentation: async (presentation: Presentation): Promise<void> => {
    console.warn(
      '[useElectron] savePresentation called outside Electron for presentation:',
      presentation
    )
  },

  getHistory: async (): Promise<Presentation[]> => {
    console.warn('[useElectron] getHistory called outside Electron — returning []')
    return []
  },

  getPresentationById: async (id: string): Promise<Presentation | null> => {
    console.warn(
      `[useElectron] getPresentationById called outside Electron for ID ${id} — returning null`
    )
    return null
  },

  deletePresentation: async (id: string): Promise<void> => {
    console.warn('[useElectron] deletePresentation called outside Electron for ID:', id)
  },

  regenerateSlide: async (
    slideIndex: number,
    currentPresentation: Presentation
  ): Promise<Slide> => {
    console.warn(
      `[useElectron] regenerateSlide called outside Electron for index ${slideIndex} on presentation:`,
      currentPresentation
    )
    return {
      id: `mock-slide-${slideIndex}`,
      html: '<h1>Mock Slide Title</h1><p>Mock slide body content</p>',
      title: 'Mock Slide Title',
      notes: 'Mock notes',
      slideType: 'content',
      index: slideIndex
    }
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings: async (): Promise<AppSettings> => {
    console.warn('[useElectron] getSettings called outside Electron — returning defaults')
    return {
      claudeApiKey: '',
      geminiApiKey: '',
      defaultTheme: 'midnight-violet',
      defaultSlideCount: 8,
      defaultNarrative: 'explainer',
      executionMode: 'local-cli',
      selectedCliId: ''
    }
  },

  saveSettings: async (settings: AppSettings): Promise<void> => {
    console.warn('[useElectron] saveSettings called outside Electron with settings:', settings)
  },

  onMenuAction: (): (() => void) => {
    console.warn('[useElectron] onMenuAction registered outside Electron — no-op')
    return noop
  },

  scanCLIs: async (): Promise<DetectedCLI[]> => {
    console.warn('[useElectron] scanCLIs called outside Electron — returning []')
    return []
  },

  rescanCLIs: async (): Promise<DetectedCLI[]> => {
    console.warn('[useElectron] rescanCLIs called outside Electron — returning []')
    return []
  },

  getAppInfo: async () => {
    console.warn('[useElectron] getAppInfo called outside Electron — returning mock')
    return { version: '1.0.1', platform: 'browser', arch: 'arm64' }
  },

  testApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    console.warn('[useElectron] testApiKey called outside Electron for key:', apiKey)
    return { valid: false, message: 'Running outside Electron' }
  },

  testGeminiApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    console.warn('[useElectron] testGeminiApiKey called outside Electron for key:', apiKey)
    return { valid: false, message: 'Running outside Electron' }
  },

  testOpenaiApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    console.warn('[useElectron] testOpenaiApiKey called outside Electron for key:', apiKey)
    return { valid: false, message: 'Running outside Electron' }
  },

  testDeepseekApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    console.warn('[useElectron] testDeepseekApiKey called outside Electron for key:', apiKey)
    return { valid: false, message: 'Running outside Electron' }
  },

  testGroqApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    console.warn('[useElectron] testGroqApiKey called outside Electron for key:', apiKey)
    return { valid: false, message: 'Running outside Electron' }
  },

  testCliTool: async (
    cliPath: string,
    cliName: string
  ): Promise<{ success: boolean; message: string; version?: string }> => {
    console.warn(
      '[useElectron] testCliTool called outside Electron for CLI:',
      cliName,
      'at path:',
      cliPath
    )
    return { success: false, message: 'Running outside Electron' }
  },

  openFileDialog: async (options?: unknown): Promise<{ canceled: boolean; filePaths: string[] }> => {
    console.warn('[useElectron] openFileDialog called outside Electron with options:', options)
    return { canceled: true, filePaths: [] }
  },

  onUpdateReady: (callback: () => void): (() => void) => {
    console.warn('[useElectron] onUpdateReady registered outside Electron with callback:', callback)
    return noopCleanup()
  },

  restartAndInstall: (): void => {
    console.warn('[useElectron] restartAndInstall called outside Electron — no-op')
  },

  generateVoiceovers: async (presentation: Presentation) => {
    console.warn(
      '[useElectron] generateVoiceovers called outside Electron for presentation:',
      presentation
    )
    return { success: false, error: 'Running outside Electron' }
  },

  onVoiceoverProgress: (
    callback: (progress: {
      state: 'generating' | 'done' | 'error'
      current: number
      total: number
      error?: string
    }) => void
  ): (() => void) => {
    console.warn(
      '[useElectron] onVoiceoverProgress registered outside Electron with callback:',
      callback
    )
    return noopCleanup()
  },

  onAudioMapReady: (callback: (audioMap: Record<number, string>) => void): (() => void) => {
    console.warn(
      '[useElectron] onAudioMapReady registered outside Electron with callback:',
      callback
    )
    return noopCleanup()
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
