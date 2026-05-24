// ─── Slide ────────────────────────────────────────────────────────────────────

export interface SlideStyle {
  titleSize?: number // Font size in em unit
  contentSize?: number // Font size in em unit
  textAlign?: 'left' | 'center' | 'right'
  headingFont?: string
  bodyFont?: string
  bgColor?: string
  textColor?: string
  accentColor?: string
  accentText?: string // Highlight/subtitle paragraph
  layout?: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote'
}

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
  slideType: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote'
  /** Zero-based position in the presentation */
  index: number
  /** List of bullet points extracted from the slide content */
  bullets?: string[]
  /** Custom styles configured for this slide */
  style?: SlideStyle
  /** Base64 MP3 narration audio data URL */
  voiceoverUrl?: string
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
  /** Aspect ratio of the presentation slides */
  aspectRatio?: '9:16' | '16:9' | '1:1'
  /** Base64 MP3 ambient loop background music URL */
  bgMusicUrl?: string
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
  /** Narrative structure style to enforce in the generation template */
  narrative?: 'pitch' | 'explainer' | 'report' | 'academic'
  /** Requested number of slides — must be between 4 and 20 */
  slideCount: number
  /** Aspect ratio configuration */
  aspectRatio?: '9:16' | '16:9' | '1:1'
  /** Whether to automatically generate images for the slides */
  generateImages?: boolean
  /** Whether to generate slide-by-slide voice narration */
  generateVoiceover?: boolean
  /** Whether to fetch background music loop matching theme */
  generateBgMusic?: boolean
}

// ─── StreamStatus ─────────────────────────────────────────────────────────────

export type StreamState = 'idle' | 'researching' | 'generating' | 'done' | 'error'

export interface StreamStatus {
  /** Current generation lifecycle state */
  state: StreamState
  /** Number of slides fully received from the stream so far */
  slidesGenerated: number
  /** Total slides expected (from GenerationConfig.slideCount) */
  totalSlides: number
  /** Human-readable error detail, present only when state === 'error' */
  errorMessage?: string
  /** Generated background music loop URL passed at completion */
  bgMusicUrl?: string
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
  /** Path to default save folder for presentations */
  defaultSaveLocation?: string
  /** Whether to export speaker notes on PPTX files */
  includeSpeakerNotes?: boolean
  /** Whether to append the Referral Footer onto exported presentations */
  addReferralFooter?: boolean
  /** Whether the onboarding experience has been fully completed */
  onboardingComplete?: boolean

  // Execution Mode (Fix 1)
  executionMode: 'local-cli' | 'anthropic-api' | 'gemini-api' | 'openai-api' | 'deepseek-api' | 'groq-api'
  selectedCliId: string
  geminiApiKey?: string
  openaiApiKey?: string
  deepseekApiKey?: string
  groqApiKey?: string

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

export interface DetectedCLI {
  id: string
  name: string
  installed: boolean
  executablePath: string | null
  version: string | null
}
