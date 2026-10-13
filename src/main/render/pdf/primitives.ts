/**
 * OpenGamma — PDFKit Primitive Scene Node Drawer
 *
 * Implements high-precision drawing of every SceneNode onto a PDFKit document.
 */

import type {
  SceneNode,
  BackgroundNode,
  RectNode,
  TextNode,
  ImageNode,
  CircleNode,
  LineNode,
  ClipGroupNode,
  PageNumberNode,
  LinkNode,
  FillValue
} from '../../layout/primitives'
import type { ThemeTokens } from '../../model/themes'
import { resolvePdfFont } from './fonts'
import { resolveImageBuffer } from './images'

export async function drawSceneNode(
  doc: PDFKit.PDFDocument,
  node: SceneNode,
  tokens: ThemeTokens,
  pageWidth: number,
  pageHeight: number
): Promise<void> {
  switch (node.kind) {
    case 'background':
      drawBackgroundNode(doc, node, pageWidth, pageHeight)
      break
    case 'rect':
      drawRectNode(doc, node)
      break
    case 'text':
      drawTextNode(doc, node)
      break
    case 'circle':
      drawCircleNode(doc, node)
      break
    case 'line':
      drawLineNode(doc, node)
      break
    case 'image':
      await drawImageNode(doc, node)
      break
    case 'clipGroup':
      await drawClipGroupNode(doc, node, tokens, pageWidth, pageHeight)
      break
    case 'pageNumber':
      drawPageNumberNode(doc, node)
      break
    case 'link':
      drawLinkNode(doc, node)
      break
  }
}

function applyFill(doc: PDFKit.PDFDocument, fill: FillValue): void {
  if (typeof fill === 'string') {
    doc.fillColor(fill)
    return
  }

  if (fill.kind === 'linearGradient') {
    const lg = doc.linearGradient(fill.x1, fill.y1, fill.x2, fill.y2)
    for (const stop of fill.stops) {
      lg.stop(stop.position, stop.color, stop.opacity ?? 1)
    }
    doc.fill(lg)
    return
  }

  if (fill.kind === 'radialGradient') {
    const rg = doc.radialGradient(fill.cx, fill.cy, 0, fill.cx, fill.cy, fill.radius)
    for (const stop of fill.stops) {
      rg.stop(stop.position, stop.color, stop.opacity ?? 1)
    }
    doc.fill(rg)
    return
  }
}

function drawBackgroundNode(
  doc: PDFKit.PDFDocument,
  node: BackgroundNode,
  pageWidth: number,
  pageHeight: number
): void {
  doc.save()

  // Base background fill
  if (typeof node.fill === 'string') {
    doc.rect(0, 0, pageWidth, pageHeight).fillColor(node.fill).fill()
  } else if (node.fill.kind === 'linearGradient') {
    const lg = doc.linearGradient(node.fill.x1, node.fill.y1, node.fill.x2, node.fill.y2)
    for (const stop of node.fill.stops) {
      lg.stop(stop.position, stop.color, stop.opacity ?? 1)
    }
    doc.rect(0, 0, pageWidth, pageHeight).fill(lg)
  }

  // Radial glow overlay if present
  if (node.glow) {
    const glowX = node.glow.cx * pageWidth
    const glowY = node.glow.cy * pageHeight
    const rg = doc.radialGradient(glowX, glowY, 0, glowX, glowY, node.glow.radius)
    rg.stop(0, node.glow.color, node.glow.opacity)
    rg.stop(1, node.glow.color, 0)
    doc.rect(0, 0, pageWidth, pageHeight).fill(rg)
  }

  doc.restore()
}

function drawRectNode(doc: PDFKit.PDFDocument, node: RectNode): void {
  doc.save()

  if (typeof node.fillOpacity === 'number') {
    doc.fillOpacity(node.fillOpacity)
  }

  if (node.radius && node.radius > 0) {
    doc.roundedRect(node.x, node.y, node.w, node.h, node.radius)
  } else {
    doc.rect(node.x, node.y, node.w, node.h)
  }

  if (node.fill) {
    applyFill(doc, node.fill)
    if (typeof node.fill === 'string') {
      doc.fill()
    }
  }

  if (node.stroke) {
    doc.strokeColor(node.stroke.color)
    doc.lineWidth(node.stroke.width)
    if (node.stroke.dashArray) {
      doc.dash(node.stroke.dashArray[0], { space: node.stroke.dashArray[1] ?? node.stroke.dashArray[0] })
    }
    if (node.radius && node.radius > 0) {
      doc.roundedRect(node.x, node.y, node.w, node.h, node.radius).stroke()
    } else {
      doc.rect(node.x, node.y, node.w, node.h).stroke()
    }
  }

  doc.restore()
}

function drawTextNode(doc: PDFKit.PDFDocument, node: TextNode): void {
  doc.save()

  const defaultFontName = resolvePdfFont(doc, node.fontFamily, node.fontWeight)
  doc.font(defaultFontName)
  doc.fontSize(node.fontSize)
  doc.fillColor(node.color)

  if (typeof node.opacity === 'number') {
    doc.fillOpacity(node.opacity)
  }

  for (const line of node.lines) {
    const lineX = node.x + line.xOffset
    if (line.runs && line.runs.length > 0) {
      let curX = lineX
      for (const run of line.runs) {
        const runFont = resolvePdfFont(
          doc,
          run.fontFamily || node.fontFamily,
          run.bold ? 'bold' : node.fontWeight
        )
        doc.font(runFont).fontSize(node.fontSize).fillColor(run.color || node.color)
        doc.text(run.text, curX, line.y, { lineBreak: false })
        const w = (doc as unknown as { widthOfString(s: string): number }).widthOfString(run.text)
        curX += w
      }
    } else {
      doc.font(defaultFontName).fontSize(node.fontSize).fillColor(node.color)
      doc.text(line.text, lineX, line.y, {
        lineBreak: false
      })
    }
  }

  doc.restore()
}

function drawCircleNode(doc: PDFKit.PDFDocument, node: CircleNode): void {
  doc.save()

  if (typeof node.fillOpacity === 'number') {
    doc.fillOpacity(node.fillOpacity)
  }

  doc.circle(node.cx, node.cy, node.r)

  if (node.fill) {
    applyFill(doc, node.fill)
    if (typeof node.fill === 'string') {
      doc.fill()
    }
  }

  if (node.stroke) {
    doc.strokeColor(node.stroke.color)
    doc.lineWidth(node.stroke.width)
    doc.circle(node.cx, node.cy, node.r).stroke()
  }

  doc.restore()
}

function drawLineNode(doc: PDFKit.PDFDocument, node: LineNode): void {
  doc.save()

  if (typeof node.opacity === 'number') {
    doc.strokeOpacity(node.opacity)
  }

  doc.strokeColor(node.color)
  doc.lineWidth(node.width)

  if (node.dashArray) {
    doc.dash(node.dashArray[0], { space: node.dashArray[1] ?? node.dashArray[0] })
  }

  doc.moveTo(node.x1, node.y1).lineTo(node.x2, node.y2).stroke()

  doc.restore()
}

async function drawImageNode(doc: PDFKit.PDFDocument, node: ImageNode): Promise<void> {
  const buffer = await resolveImageBuffer(node.src)
  if (!buffer) return

  doc.save()

  // 1. Clip to rounded rect if radius provided
  if (node.radius && node.radius > 0) {
    doc.roundedRect(node.x, node.y, node.w, node.h, node.radius).clip()
  }

  try {
    // 2. Draw image scaled to fit dimensions
    doc.image(buffer, node.x, node.y, {
      width: node.w,
      height: node.h,
      fit: [node.w, node.h],
      align: 'center',
      valign: 'center'
    })
  } catch (err) {
    console.warn('[PDF] PDFKit image rendering warning:', err)
  }

  // 3. Draw gradient scrim if configured
  if (node.scrim) {
    const intensity = node.scrim.intensity || 0.4
    const grad = doc.linearGradient(node.x, node.y + node.h, node.x, node.y)
    grad.stop(0, '#000000', intensity)
    grad.stop(0.6, '#000000', intensity * 0.4)
    grad.stop(1, '#000000', 0)
    doc.rect(node.x, node.y, node.w, node.h).fill(grad)
  }

  doc.restore()
}

async function drawClipGroupNode(
  doc: PDFKit.PDFDocument,
  node: ClipGroupNode,
  tokens: ThemeTokens,
  pageWidth: number,
  pageHeight: number
): Promise<void> {
  doc.save()

  if (node.radius && node.radius > 0) {
    doc.roundedRect(node.x, node.y, node.w, node.h, node.radius).clip()
  } else {
    doc.rect(node.x, node.y, node.w, node.h).clip()
  }

  for (const child of node.children) {
    await drawSceneNode(doc, child, tokens, pageWidth, pageHeight)
  }

  doc.restore()
}

function drawPageNumberNode(doc: PDFKit.PDFDocument, node: PageNumberNode): void {
  doc.save()

  const fontName = resolvePdfFont(doc, node.fontFamily, 'regular')
  doc.font(fontName)
  doc.fontSize(node.fontSize)
  doc.fillColor(node.color)

  const numText = String(node.n).padStart(2, '0')
  doc.text(numText, node.x, node.y, {
    width: node.w,
    align: node.align,
    lineBreak: false
  })

  doc.restore()
}

function drawLinkNode(doc: PDFKit.PDFDocument, node: LinkNode): void {
  try {
    doc.link(node.x, node.y, node.w, node.h, node.url)
  } catch {
    // Ignore link errors
  }
}
