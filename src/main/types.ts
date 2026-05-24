// ─── IPC Channel Names ────────────────────────────────────────────────────────
//
// Single source of truth for every IPC channel string used between the main
// process (src/main/ipc.ts) and the renderer (via the preload context bridge).
// Import this enum in both main and preload — never hardcode channel strings.

export enum IpcChannels {
  // ── Generation ──────────────────────────────────────────────────────────────
  /** Renderer → Main: start streaming slide generation from Claude */
  GENERATE_SLIDES = 'generate:slides',
  /** Renderer → Main: regenerate a single slide in isolation */
  REGENERATE_SLIDE = 'generate:regenerate-slide',
  /** Renderer → Main: abort an in-progress generation stream */
  CANCEL_GENERATION = 'generate:cancel',

  // ── Export ──────────────────────────────────────────────────────────────────
  /** Renderer → Main: serialise slides to a .pptx file and save to disk */
  EXPORT_PPTX = 'export:pptx',

  // ── Persistence ─────────────────────────────────────────────────────────────
  /** Renderer → Main: persist a completed presentation to SQLite */
  SAVE_PRESENTATION = 'history:save',
  /** Renderer → Main: retrieve all saved presentations from SQLite */
  GET_HISTORY = 'history:get',
  /** Renderer → Main: retrieve a single presentation from SQLite by ID */
  GET_PRESENTATION_BY_ID = 'history:get-by-id',
  /** Renderer → Main: remove a presentation record from SQLite */
  DELETE_PRESENTATION = 'history:delete',

  // ── Settings ────────────────────────────────────────────────────────────────
  /** Renderer → Main: read app settings from electron-store */
  GET_SETTINGS = 'settings:get',
  /** Renderer → Main: write updated app settings to electron-store */
  SAVE_SETTINGS = 'settings:save',

  // ── Utilities ───────────────────────────────────────────────────────────────
  /** Renderer → Main: open a native OS file-picker dialog */
  OPEN_FILE_DIALOG = 'dialog:open-file',

  // ── CLI Tools ───────────────────────────────────────────────────────────────
  /** Renderer → Main: auto-detect system CLI tools */
  DETECT_CLI_TOOLS = 'settings:detect-cli-tools',
  SCAN_CLIS = 'settings:scan-clis',
  RESCAN_CLIS = 'settings:rescan-clis',

  /** Renderer → Main: test if a Claude API key is valid */
  TEST_API_KEY = 'settings:test-api-key',
  /** Renderer → Main: test if a Gemini API key is valid */
  TEST_GEMINI_API_KEY = 'settings:test-gemini-api-key',
  /** Renderer → Main: test if an OpenAI API key is valid */
  TEST_OPENAI_API_KEY = 'settings:test-openai-api-key',
  /** Renderer → Main: test if a DeepSeek API key is valid */
  TEST_DEEPSEEK_API_KEY = 'settings:test-deepseek-api-key',
  /** Renderer → Main: test if a Groq API key is valid */
  TEST_GROQ_API_KEY = 'settings:test-groq-api-key',
  /** Renderer → Main: test if a detected CLI tool is accessible */
  TEST_CLI_TOOL = 'settings:test-cli-tool'
}

export interface DetectedCLI {
  id: string
  name: string
  installed: boolean
  executablePath: string | null
  version: string | null
}
