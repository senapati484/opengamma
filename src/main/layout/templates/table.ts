/**
 * OpenGamma — Table Slide Layout Template
 *
 * Structured tabular data layout with styled header row,
 * zebra alternating rows, clean border lines, and auto-spaced columns.
 */

import type { DeckSlide, PageDims, TableBlock, HeadingBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode
} from '../grid'
import { wrapText } from '../measure'

export function layoutTableSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  // 1. Background
  nodes.push(makeBackground(page, tokens))

  // 2. Accent bar
  nodes.push(makeAccentBar(page, tokens))

  // Find blocks
  const headingBlock = slide.blocks.find((b) => b.type === 'heading') as HeadingBlock | undefined
  const tableBlock = slide.blocks.find((b) => b.type === 'table') as TableBlock | undefined

  const titleText = headingBlock?.text || 'Data Breakdown'
  const maxWidth = page.contentWidth

  // 3. Heading
  let curY = page.marginY + 10
  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 1)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 24

  // 4. Table
  const headers = tableBlock?.headers || ['Item', 'Description', 'Value']
  const rows = tableBlock?.rows || []
  const colCount = Math.max(1, headers.length)
  const colW = maxWidth / colCount
  const rowH = 34
  const headerH = 38
  const tableH = Math.min(300, headerH + rows.length * rowH)

  // Outer container border
  nodes.push({
    kind: 'rect',
    x: page.marginX,
    y: curY,
    w: maxWidth,
    h: tableH,
    radius: tokens.radius.r2,
    stroke: { color: tokens.colors.border, width: 0.75 }
  })

  // Header background
  nodes.push({
    kind: 'rect',
    x: page.marginX,
    y: curY,
    w: maxWidth,
    h: headerH,
    radius: tokens.radius.r2,
    fill: tokens.colors.surface
  })

  // Header text
  for (let c = 0; c < colCount; c++) {
    const text = headers[c] || ''
    const cellX = page.marginX + c * colW + 14
    const { lines } = wrapText(text, curY + 12, {
      family: tokens.fonts.headingBold.family,
      weight: tokens.fonts.headingBold.weight,
      fontSize: tokens.type.sm,
      lineHeight: 1.2,
      maxWidth: colW - 28
    })
    nodes.push({
      kind: 'text',
      x: cellX,
      y: curY + 12,
      w: colW - 28,
      lines,
      fontFamily: tokens.fonts.headingBold.family,
      fontWeight: tokens.fonts.headingBold.weight,
      fontSize: tokens.type.sm,
      color: tokens.colors.heading,
      lineHeight: 1.2
    })
  }

  let rowY = curY + headerH

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    if (rowY + rowH > curY + tableH) break
    const row = rows[r]
    const isEven = r % 2 === 0

    // Zebra fill
    if (isEven) {
      nodes.push({
        kind: 'rect',
        x: page.marginX,
        y: rowY,
        w: maxWidth,
        h: rowH,
        fill: tokens.colors.surface,
        fillOpacity: 0.4
      })
    }

    // Row divider
    nodes.push({
      kind: 'line',
      x1: page.marginX,
      y1: rowY,
      x2: page.marginX + maxWidth,
      y2: rowY,
      color: tokens.colors.border,
      width: 0.5,
      opacity: 0.5
    })

    // Cells
    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] || ''
      const cellX = page.marginX + c * colW + 14
      const { lines } = wrapText(cellText, rowY + 9, {
        family: tokens.fonts.body.family,
        weight: tokens.fonts.body.weight,
        fontSize: tokens.type.sm,
        lineHeight: 1.2,
        maxWidth: colW - 28
      })
      nodes.push({
        kind: 'text',
        x: cellX,
        y: rowY + 9,
        w: colW - 28,
        lines,
        fontFamily: tokens.fonts.body.family,
        fontWeight: tokens.fonts.body.weight,
        fontSize: tokens.type.sm,
        color: tokens.colors.text,
        lineHeight: 1.2
      })
    }

    rowY += rowH
  }

  return nodes
}
