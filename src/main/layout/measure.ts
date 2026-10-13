/**
 * OpenGamma — Text Measurement Engine
 *
 * Precise text wrapping and measurement using PDFKit's internal fontkit.
 * This runs in the MAIN process (Node.js) — it has access to local font files.
 *
 * CRITICAL: The layout engine wraps text. The PDF backend draws pre-wrapped lines.
 * The two must agree on every line break or text will overlap/overflow.
 */

import path from 'path'
import fs from 'fs'
import type { FontWeight } from '../model/themes'
import { getFontFileName } from '../model/themes'
import type { WrappedLine } from './primitives'

// ─── Font file resolution ─────────────────────────────────────────────────────

let fontsDir: string

export function setFontsDir(dir: string): void {
  fontsDir = dir
}

export function getFontsDir(): string {
  if (fontsDir) return fontsDir
  const candidates = [
    path.join(process.resourcesPath ?? '', 'fonts'),
    path.join(process.cwd(), 'resources', 'fonts'),
    path.join(__dirname, '..', '..', '..', '..', 'resources', 'fonts'),
    path.join(__dirname, '..', '..', '..', 'resources', 'fonts')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      fontsDir = candidate
      return fontsDir
    }
  }
  // Fall back to default path without throwing
  fontsDir = path.join(process.cwd(), 'resources', 'fonts')
  return fontsDir
}

export function getFontPath(family: string, weight: FontWeight): string {
  const fileName = getFontFileName(family, weight)
  return path.join(getFontsDir(), fileName)
}

export function fontFileExists(family: string, weight: FontWeight): boolean {
  try {
    const p = getFontPath(family, weight)
    return fs.existsSync(p)
  } catch {
    return false
  }
}

function getStandardFallback(family: string, weight: FontWeight): string {
  const isBold = weight === 'bold' || weight === 'extrabold' || weight === 'semibold'
  const isSerif = /serif|playfair|lora|garamond|bodoni|fraunces/i.test(family)
  const isMono = /mono|code|console|grotesk/i.test(family)

  if (isMono) return isBold ? 'Courier-Bold' : 'Courier'
  if (isSerif) return isBold ? 'Times-Bold' : 'Times-Roman'
  return isBold ? 'Helvetica-Bold' : 'Helvetica'
}

import PDFDocument from 'pdfkit'

// ─── PDFKit-backed measurement ────────────────────────────────────────────────

// We use a lazy singleton PDFKit document just for measurement.
// This avoids the overhead of creating a new doc per measurement call.
let _measureDoc: PDFKit.PDFDocument | null = null

function getMeasureDoc(): PDFKit.PDFDocument {
  if (_measureDoc) return _measureDoc
  _measureDoc = new PDFDocument({ size: [960, 540], margin: 0, autoFirstPage: false })
  return _measureDoc
}

// Font registration cache — prevents re-registering on every call
const _registeredFonts = new Map<string, string>()

function ensureFontRegistered(family: string, weight: FontWeight): string {
  const key = `${family}:${weight}`
  if (_registeredFonts.has(key)) {
    return _registeredFonts.get(key)!
  }

  try {
    const filePath = getFontPath(family, weight)
    if (fs.existsSync(filePath)) {
      getMeasureDoc().registerFont(key, filePath)
      _registeredFonts.set(key, key)
      return key
    }
  } catch {
    // Ignore and proceed to fallback
  }

  const fallback = getStandardFallback(family, weight)
  _registeredFonts.set(key, fallback)
  return fallback
}

/**
 * Measure the rendered width of a single-line string in points.
 */
export function measureTextWidth(
  text: string,
  family: string,
  weight: FontWeight,
  fontSize: number
): number {
  try {
    const key = ensureFontRegistered(family, weight)
    const doc = getMeasureDoc()
    doc.font(key).fontSize(fontSize)
    return (doc as unknown as { widthOfString(s: string): number }).widthOfString(text)
  } catch {
    // Fallback estimation: ~0.55 * fontSize per character (conservative)
    return text.length * fontSize * 0.55
  }
}

/**
 * Measure the line height for a given font size and line-height multiplier.
 */
export function measureLineHeight(fontSize: number, lineHeightMultiplier: number): number {
  return Math.ceil(fontSize * lineHeightMultiplier)
}

// ─── Text wrapping ────────────────────────────────────────────────────────────

export interface WrapOptions {
  family: string
  weight: FontWeight
  fontSize: number
  lineHeight: number        // multiplier
  maxWidth: number
  maxLines?: number         // truncate after this many lines
  indent?: number           // first-line indent in points
  hangingIndent?: number    // negative first-line indent (for bullets)
  align?: 'left' | 'center' | 'right'
}

export interface WrappedResult {
  lines: WrappedLine[]
  totalHeight: number
  overflow: boolean
}

/**
 * Wraps text into lines that fit within maxWidth.
 * Returns absolute x offsets and y positions for each line.
 */
export function wrapText(text: string, startY: number, opts: WrapOptions): WrappedResult {
  const {
    family,
    weight,
    fontSize,
    lineHeight,
    maxWidth,
    maxLines,
    indent = 0,
    hangingIndent = 0,
    align = 'left'
  } = opts

  const lh = measureLineHeight(fontSize, lineHeight)
  const words = text.split(/\s+/).filter(Boolean)
  const lines: Array<{ text: string; xOffset: number; y: number }> = []
  let currentLine = ''
  let currentWidth = 0
  let overflow = false

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wordWidth = measureTextWidth(word, family, weight, fontSize)
    const spaceWidth = currentLine ? measureTextWidth(' ', family, weight, fontSize) : 0
    const isFirstLine = lines.length === 0
    const lineMaxWidth = maxWidth - (isFirstLine ? indent : hangingIndent < 0 ? -hangingIndent : 0)

    if (currentLine && currentWidth + spaceWidth + wordWidth > lineMaxWidth) {
      // Flush current line
      lines.push(buildLine(currentLine, lines.length, startY, lh, maxWidth, indent, hangingIndent, align, family, weight, fontSize))
      currentLine = word
      currentWidth = wordWidth
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word
      currentWidth += spaceWidth + wordWidth
    }
  }

  // Flush last line
  if (currentLine) {
    lines.push(buildLine(currentLine, lines.length, startY, lh, maxWidth, indent, hangingIndent, align, family, weight, fontSize))
  }

  // Truncate if maxLines exceeded
  if (maxLines && lines.length > maxLines) {
    overflow = true
    const truncated = lines.slice(0, maxLines)
    // Add ellipsis to last line
    const last = truncated[truncated.length - 1]
    truncated[truncated.length - 1] = { ...last, text: truncateWithEllipsis(last.text, maxWidth - (last.xOffset || 0), family, weight, fontSize) }
    return { lines: truncated, totalHeight: maxLines * lh, overflow }
  }

  return { lines, totalHeight: lines.length * lh, overflow }
}

function buildLine(
  text: string,
  lineIndex: number,
  startY: number,
  lh: number,
  maxWidth: number,
  indent: number,
  hangingIndent: number,
  align: 'left' | 'center' | 'right',
  family: string,
  weight: FontWeight,
  fontSize: number
): WrappedLine {
  const y = startY + lineIndex * lh
  let xOffset = 0

  if (lineIndex === 0 && indent !== 0) {
    xOffset = indent
  } else if (hangingIndent < 0) {
    xOffset = -hangingIndent  // positive offset = hanging bullet outdents
  }

  if (align === 'center') {
    const textWidth = measureTextWidth(text, family, weight, fontSize)
    xOffset = Math.max(0, (maxWidth - textWidth) / 2)
  } else if (align === 'right') {
    const textWidth = measureTextWidth(text, family, weight, fontSize)
    xOffset = Math.max(0, maxWidth - textWidth)
  }

  return { text, xOffset, y }
}

function truncateWithEllipsis(
  text: string,
  maxWidth: number,
  family: string,
  weight: FontWeight,
  fontSize: number
): string {
  const ellipsis = '…'
  const ellipsisWidth = measureTextWidth(ellipsis, family, weight, fontSize)
  let truncated = text
  while (
    truncated.length > 0 &&
    measureTextWidth(truncated, family, weight, fontSize) + ellipsisWidth > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd()
  }
  return truncated + ellipsis
}

// ─── Autofit ──────────────────────────────────────────────────────────────────

export interface AutofitResult {
  fontSize: number
  lineHeight: number
  overflow: boolean
}

/**
 * Tries to fit text within a given height by progressively reducing
 * font size and line height. Returns the adjusted values.
 */
export function autofit(
  text: string,
  opts: WrapOptions & { maxHeight: number; minFontSize?: number }
): AutofitResult {
  const { maxHeight, minFontSize = 11 } = opts
  let fontSize = opts.fontSize
  let lineHeight = opts.lineHeight

  // Step 1: Try reducing body font size (18 → 16 → 14 → 12 → minFontSize)
  for (const trySize of [fontSize, fontSize - 2, fontSize - 4, fontSize - 6, minFontSize]) {
    if (trySize < minFontSize) break
    // Step 2: Try tightening line height (1.45 → 1.3 → 1.2)
    for (const tryLH of [lineHeight, 1.3, 1.2]) {
      const result = wrapText(text, 0, { ...opts, fontSize: trySize, lineHeight: tryLH })
      if (result.totalHeight <= maxHeight) {
        return { fontSize: trySize, lineHeight: tryLH, overflow: false }
      }
    }
    fontSize = trySize - 2
    lineHeight = opts.lineHeight
  }

  return { fontSize: minFontSize, lineHeight: 1.2, overflow: true }
}
