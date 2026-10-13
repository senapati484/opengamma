/**
 * OpenGamma — PDFKit Font Registry & Resolver
 *
 * Registers TTF fonts with PDFKit.
 * If local font files are unavailable, smoothly maps to PDFKit's built-in standard 14 fonts
 * (Helvetica, Times-Roman, Courier, etc.) to guarantee 100% crash-free exports.
 */

import path from 'path'
import fs from 'fs'
import type { FontWeight, ThemeTokens } from '../../model/themes'
import { getFontFileName } from '../../model/themes'
import { getFontsDir } from '../../layout/measure'

const registeredInDoc = new WeakMap<PDFKit.PDFDocument, Map<string, string>>()

export function getFontFamilyFallback(family: string, weight: FontWeight): string {
  const isBold = weight === 'bold' || weight === 'extrabold' || weight === 'semibold'
  const isSerif = /serif|playfair|lora|garamond|bodoni|fraunces/i.test(family)
  const isMono = /mono|code|console|grotesk/i.test(family)

  if (isMono) return isBold ? 'Courier-Bold' : 'Courier'
  if (isSerif) return isBold ? 'Times-Bold' : 'Times-Roman'
  return isBold ? 'Helvetica-Bold' : 'Helvetica'
}

/**
 * Ensures a font is registered on the given PDFDocument instance.
 * Returns the font name to pass to doc.font(name).
 */
export function resolvePdfFont(
  doc: PDFKit.PDFDocument,
  family: string,
  weight: FontWeight = 'regular'
): string {
  let docFonts = registeredInDoc.get(doc)
  if (!docFonts) {
    docFonts = new Map<string, string>()
    registeredInDoc.set(doc, docFonts)
  }

  const key = `${family}-${weight}`
  if (docFonts.has(key)) {
    return docFonts.get(key)!
  }

  try {
    const fileName = getFontFileName(family, weight)
    const fontPath = path.join(getFontsDir(), fileName)

    if (fs.existsSync(fontPath)) {
      doc.registerFont(key, fontPath)
      docFonts.set(key, key)
      return key
    }
  } catch {
    // Ignore and fallback
  }

  // Fallback to standard PDFKit font
  const fallback = getFontFamilyFallback(family, weight)
  docFonts.set(key, fallback)
  return fallback
}

/**
 * Pre-registers the theme's core fonts for the given document.
 */
export function registerThemeFonts(doc: PDFKit.PDFDocument, tokens: ThemeTokens): void {
  resolvePdfFont(doc, tokens.fonts.heading.family, tokens.fonts.heading.weight)
  resolvePdfFont(doc, tokens.fonts.headingBold.family, tokens.fonts.headingBold.weight)
  resolvePdfFont(doc, tokens.fonts.body.family, tokens.fonts.body.weight)
  resolvePdfFont(doc, tokens.fonts.bodySemiBold.family, tokens.fonts.bodySemiBold.weight)
  resolvePdfFont(doc, tokens.fonts.mono.family, tokens.fonts.mono.weight)
}
