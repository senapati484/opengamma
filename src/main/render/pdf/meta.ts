/**
 * OpenGamma — PDF Metadata and Bookmarks
 *
 * Configures PDF document metadata and generates outline bookmarks
 * for easy slide navigation in PDF readers (Preview, Acrobat).
 */

import type { Deck } from '../../model/schema'

export function applyPdfMetadata(doc: PDFKit.PDFDocument, deck: Deck): void {
  doc.info['Title'] = deck.meta.title || 'OpenGamma Presentation'
  doc.info['Author'] = deck.meta.author || 'OpenGamma'
  doc.info['Subject'] = deck.meta.subject || 'Interactive Deck'
  doc.info['Creator'] = 'OpenGamma Native Presentation Engine'
  doc.info['Producer'] = 'OpenGamma (https://github.com/senapati484/opengamma)'
  doc.info['CreationDate'] = new Date()
}

export function generatePdfBookmarks(doc: PDFKit.PDFDocument, deck: Deck): void {
  try {
    const outline = doc.outline
    if (!outline) return

    for (let i = 0; i < deck.slides.length; i++) {
      const slide = deck.slides[i]
      const heading = slide.blocks.find((b) => b.type === 'heading')
      const title = heading?.text || `Slide ${i + 1}`

      // Create bookmark top-level item
      outline.addItem(title)
    }
  } catch (err) {
    console.warn('[PDF] Failed to generate outline bookmarks:', err)
  }
}
