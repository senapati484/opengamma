// ─── Slide ────────────────────────────────────────────────────────────────────

export interface Slide {
  /** Unique identifier for the slide */
  id: string
  /** Raw Reveal.js <section> HTML */
  html: string
  /** Title text extracted from the first h1 or h2 */
  title: string
  /** Speaker notes extracted from <aside class="notes"> */
  notes: string
  /** Layout archetype used when generating this slide */
  slideType: 'title' | 'content' | 'split' | 'data' | 'cta'
  /** Zero-based position in the presentation */
  index: number
  /** List of bullet points extracted from the slide content */
  bullets?: string[]
}

// ─── Presentation ─────────────────────────────────────────────────────────────

export interface Presentation {
  /** Unique identifier for the presentation */
  id: string
  /** Original user prompt that generated the presentation */
  prompt: string
  /** Design system / theme id applied to this presentation */
  theme: string
  /** Ordered collection of slides */
  slides: Slide[]
  /** Unix timestamp (ms) of when the presentation was created */
  createdAt: number
  /** Derived from the title slide — used in history & exports */
  title: string
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  bg: string
  text: string
}

export interface Theme {
  /** Unique slug identifier */
  id: string
  /** Human-readable display name */
  name: string
  /** Short description shown in the theme picker */
  description: string
  /** Raw CSS custom property declarations injected into the slide iframe */
  cssTokens: string
  /** Built-in Reveal.js theme to use as the rendering base */
  revealTheme: string
  /** Colour values used for the preview swatch in ThemePicker */
  colors: ThemeColors
  /** Google Font import declarations */
  fontImport?: string
}

// ─── GenerationConfig ─────────────────────────────────────────────────────────

export interface GenerationConfig {
  /** User-supplied prompt describing the presentation */
  prompt: string
  /** Selected design theme */
  theme: Theme
  /** Requested number of slides — must be between 4 and 20 */
  slideCount: number
}

// ─── StreamStatus ─────────────────────────────────────────────────────────────

export type StreamState = 'idle' | 'generating' | 'done' | 'error'

export interface StreamStatus {
  /** Current generation lifecycle state */
  state: StreamState
  /** Number of slides fully received from the stream so far */
  slidesGenerated: number
  /** Total slides expected (from GenerationConfig.slideCount) */
  totalSlides: number
  /** Human-readable error detail, present only when state === 'error' */
  errorMessage?: string
}

// ─── AppSettings ──────────────────────────────────────────────────────────────

export interface AppSettings {
  /** Anthropic Claude API key — stored in electron-store, never in source */
  claudeApiKey: string
  /** Theme id to pre-select when opening a new presentation */
  defaultTheme: string
  /** Slide count to pre-fill in the generation form */
  defaultSlideCount: number
  /** Narrative style to pre-select in the generation form */
  defaultNarrative: string
  /** Local CLI tool selected (e.g. 'gemini', 'opencode', or empty/'claude') */
  cliTool?: string
  /** Path to the local CLI binary */
  cliPath?: string
  /** Custom model name/routing path to use for local CLI tool execution */
  modelName?: string
  /** Path to default save folder for presentations */
  defaultSaveLocation?: string
  /** Whether to export speaker notes on PPTX files */
  includeSpeakerNotes?: boolean
  /** Whether to append the Referral Footer onto exported presentations */
  addReferralFooter?: boolean
  /** Whether the onboarding experience has been fully completed */
  onboardingComplete?: boolean
  /** Local CLI temperature */
  cliTemperature?: number
  /** Local CLI max tokens */
  cliMaxTokens?: number
  /** Local CLI output mode */
  cliOutputMode?: 'stream' | 'buffered'
  /** Local CLI custom arguments */
  cliCustomArgs?: string
  /** Local CLI working directory */
  cliWorkingDir?: string
  /** Local CLI environment variables */
  cliEnvVars?: string
}

// ─── CLI Tool ─────────────────────────────────────────────────────────────────

export interface CliTool {
  /** The name of the binary */
  name: string
  /** The absolute path of the binary on the system */
  path: string
  /** The version string of the binary (for featured/known tools) */
  version?: string
  /** Whether this tool is highlighted/featured */
  isFeatured: boolean
}
