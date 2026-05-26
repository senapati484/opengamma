import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { Presentation } from '../renderer/src/types'

let db: Database.Database | null = null
/** Set to true once initDb() has been attempted, so we don't retry on every call. */
let dbInitAttempted = false

/**
 * Initializes the SQLite database inside the user app data directory.
 * Sets journal mode to WAL for improved performance and creates the presentations schema.
 * Does NOT throw — failures are logged and the app continues without history.
 */
export function initDb(): void {
  if (db || dbInitAttempted) return
  dbInitAttempted = true

  const dbPath = join(app.getPath('userData'), 'opengamma.db')
  console.log(`[db] Initialising SQLite database at: ${dbPath}`)

  try {
    db = new Database(dbPath)
    // Enable Write-Ahead Logging (WAL) for faster reads/writes and concurrency
    db.pragma('journal_mode = WAL')

    // Create the presentations table schema if it does not exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS presentations (
        id TEXT PRIMARY KEY,
        title TEXT,
        prompt TEXT,
        theme_id TEXT,
        slide_count INTEGER,
        slides_json TEXT,
        created_at INTEGER
      )
    `)

    // Schema Migration: Add aspect_ratio column if it does not exist
    try {
      db.exec('ALTER TABLE presentations ADD COLUMN aspect_ratio TEXT')
      console.log('[db] Database schema migrated successfully: aspect_ratio column verified.')
    } catch (_e) {
      // Column already exists — expected on subsequent launches
    }

    // Schema Migration: Add bg_music_url column if it does not exist
    try {
      db.exec('ALTER TABLE presentations ADD COLUMN bg_music_url TEXT')
      console.log('[db] Database schema migrated successfully: bg_music_url column verified.')
    } catch (_e) {
      // Column already exists — expected on subsequent launches
    }

    console.log('[db] SQLite presentations table initialised successfully.')
  } catch (err: unknown) {
    // Non-fatal: native module may be wrong architecture, missing, etc.
    // The app will still open — history features just won't be available.
    db = null
    console.error('[db] Failed to initialise SQLite database (history unavailable):', err)
  }
}

/**
 * Returns the database reference, or null if it was never successfully opened.
 * Callers must handle the null case gracefully.
 */
function getDb(): Database.Database | null {
  if (!dbInitAttempted) initDb()
  return db
}

/**
 * Saves a presentation to the local SQLite database. Performs an INSERT OR REPLACE (upsert).
 *
 * @param p The presentation object to save
 */
export function savePresentation(p: Presentation): void {
  const database = getDb()
  if (!database) {
    console.warn('[db] savePresentation skipped — database unavailable.')
    return
  }
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO presentations (
      id, title, prompt, theme_id, slide_count, slides_json, created_at, aspect_ratio, bg_music_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    p.id,
    p.title || 'Untitled Presentation',
    p.prompt || '',
    p.theme || '',
    p.slides ? p.slides.length : 0,
    JSON.stringify(p.slides || []),
    p.createdAt || Date.now(),
    p.aspectRatio || '16:9',
    p.bgMusicUrl || null
  )
  console.log(
    `[db] Presentation saved successfully — ID: ${p.id}, Title: "${p.title}", Ratio: ${p.aspectRatio || '16:9'}`
  )
}

/**
 * Retrieves the history of presentations sorted by creation date descending.
 *
 * @param limit The maximum number of entries to retrieve (default 50)
 * @returns Array of Presentation records mapped from SQLite columns
 */
export function getHistory(limit = 50): Presentation[] {
  const database = getDb()
  if (!database) {
    console.warn('[db] getHistory skipped — database unavailable.')
    return []
  }
  const stmt = database.prepare(`
    SELECT id, title, prompt, theme_id, slide_count, slides_json, created_at, aspect_ratio, bg_music_url
    FROM presentations
    ORDER BY created_at DESC
    LIMIT ?
  `)

  const rows = stmt.all(limit) as Array<{
    id: string
    title: string
    prompt: string
    theme_id: string
    slide_count: number
    slides_json: string
    created_at: number
    aspect_ratio?: string
    bg_music_url?: string
  }>

  return rows.map((row) => ({
    id: row.id,
    title: row.title || 'Untitled Presentation',
    prompt: row.prompt || '',
    theme: row.theme_id || '',
    slides: JSON.parse(row.slides_json || '[]'),
    createdAt: row.created_at,
    aspectRatio: (row.aspect_ratio as any) || '16:9',
    bgMusicUrl: row.bg_music_url
  }))
}

/**
 * Deletes a presentation record from the database.
 *
 * @param id Unique ID of the presentation to delete
 */
export function deletePresentation(id: string): void {
  const database = getDb()
  if (!database) {
    console.warn('[db] deletePresentation skipped — database unavailable.')
    return
  }
  const stmt = database.prepare('DELETE FROM presentations WHERE id = ?')
  stmt.run(id)
  console.log(`[db] Presentation deleted — ID: ${id}`)
}

/**
 * Retrieves a single presentation by its unique ID.
 *
 * @param id Unique ID of the presentation to look up
 * @returns Mapped Presentation object or null if not found
 */
export function getPresentationById(id: string): Presentation | null {
  const database = getDb()
  if (!database) {
    console.warn('[db] getPresentationById skipped — database unavailable.')
    return null
  }
  const stmt = database.prepare(`
    SELECT id, title, prompt, theme_id, slide_count, slides_json, created_at, aspect_ratio, bg_music_url
    FROM presentations
    WHERE id = ?
  `)

  const row = stmt.get(id) as
    | {
        id: string
        title: string
        prompt: string
        theme_id: string
        slide_count: number
        slides_json: string
        created_at: number
        aspect_ratio?: string
        bg_music_url?: string
      }
    | undefined

  if (!row) return null

  return {
    id: row.id,
    title: row.title || 'Untitled Presentation',
    prompt: row.prompt || '',
    theme: row.theme_id || '',
    slides: JSON.parse(row.slides_json || '[]'),
    createdAt: row.created_at,
    aspectRatio: (row.aspect_ratio as any) || '16:9',
    bgMusicUrl: row.bg_music_url
  }
}
