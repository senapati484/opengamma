/**
 * OpenGamma — Native PDF Engine Orchestrator
 *
 * Direct vector/drawn PDF export from structured Deck model.
 * Produces crisp, beautiful vector slides, true typography, gradient shadings,
 * and precise layout without relying on HTML-to-print rasterization.
 */

import fs from 'fs'
import PDFDocument from 'pdfkit'
import type { Deck } from '../../model/schema'
import { getPageDims } from '../../model/schema'
import { getThemeTokens } from '../../model/themes'
import { layoutSlide } from '../../layout'
import { registerThemeFonts } from './fonts'
import { drawSceneNode } from './primitives'
import { applyPdfMetadata, generatePdfBookmarks } from './meta'

export interface RenderPdfOptions {
  showPageNumbers?: boolean
}

/**
 * Renders a structured Deck to a vector-native PDF file on disk.
 */
export async function renderPdf(
  deck: Deck,
  outputPath: string,
  options: RenderPdfOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const pageDims = getPageDims(deck.aspectRatio || '16:9')
  const tokens = getThemeTokens(deck.themeId)

  const doc = new PDFDocument({
    size: [pageDims.width, pageDims.height],
    margin: 0,
    autoFirstPage: false
  })

  const writeStream = fs.createWriteStream(outputPath)
  doc.pipe(writeStream)

  // Configure fonts and metadata
  registerThemeFonts(doc, tokens)
  applyPdfMetadata(doc, deck)

  const total = deck.slides.length

  for (let i = 0; i < total; i++) {
    const slide = deck.slides[i]

    // Add page with exact slide dimensions and zero margin
    doc.addPage({
      size: [pageDims.width, pageDims.height],
      margin: 0
    })

    // Compute scene graph through layout engine
    const rendered = layoutSlide(slide, tokens, pageDims, i, total, {
      showPageNumbers: options.showPageNumbers
    })

    // Draw each scene node
    for (const node of rendered.nodes) {
      await drawSceneNode(doc, node, tokens, pageDims.width, pageDims.height)
    }

    onProgress?.(i + 1, total)
  }

  // Generate bookmarks table of contents
  generatePdfBookmarks(doc, deck)

  // Finalize document stream
  doc.end()

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve())
    writeStream.on('error', (err) => reject(err))
  })
}

/**
 * Renders a structured Deck to an in-memory PDF Buffer.
 * Ideal for live previews and fast stream responses.
 */
export async function renderPdfBuffer(
  deck: Deck,
  options: RenderPdfOptions = {}
): Promise<Buffer> {
  const pageDims = getPageDims(deck.aspectRatio || '16:9')
  const tokens = getThemeTokens(deck.themeId)

  const doc = new PDFDocument({
    size: [pageDims.width, pageDims.height],
    margin: 0,
    autoFirstPage: false
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))

  registerThemeFonts(doc, tokens)
  applyPdfMetadata(doc, deck)

  const total = deck.slides.length

  for (let i = 0; i < total; i++) {
    const slide = deck.slides[i]

    doc.addPage({
      size: [pageDims.width, pageDims.height],
      margin: 0
    })

    const rendered = layoutSlide(slide, tokens, pageDims, i, total, {
      showPageNumbers: options.showPageNumbers
    })

    for (const node of rendered.nodes) {
      await drawSceneNode(doc, node, tokens, pageDims.width, pageDims.height)
    }
  }

  generatePdfBookmarks(doc, deck)
  doc.end()

  await new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve())
    doc.on('error', (err) => reject(err))
  })

  return Buffer.concat(chunks)
}

export * from './fonts'
export * from './primitives'
export * from './images'
export * from './meta'

