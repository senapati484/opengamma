// ─── IPC Channel Names ────────────────────────────────────────────────────────
//
// Single source of truth for every IPC channel string used between the main
// process (src/main/ipc.ts) and the renderer (via the preload context bridge).
// Import this enum in both main and preload — never hardcode channel strings.

export enum IpcChannels {
  // ── Generation ──────────────────────────────────────────────────────────────
  /** Renderer → Main: start streaming slide generation from Claude */
  GENERATE_SLIDES = 'generate:slides',
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
  /** Renderer → Main: remove a presentation record from SQLite */
  DELETE_PRESENTATION = 'history:delete',

  // ── Settings ────────────────────────────────────────────────────────────────
  /** Renderer → Main: read app settings from electron-store */
  GET_SETTINGS = 'settings:get',
  /** Renderer → Main: write updated app settings to electron-store */
  SAVE_SETTINGS = 'settings:save',

  // ── Utilities ───────────────────────────────────────────────────────────────
  /** Renderer → Main: open a native OS file-picker dialog */
  OPEN_FILE_DIALOG = 'dialog:open-file'
}
