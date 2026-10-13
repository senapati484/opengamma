/**
 * OpenGamma — Two Column Slide Layout Template
 *
 * Comparison layout (e.g. Before / After, Challenges / Solutions, Pros / Cons)
 * with distinct column card containers, accent markers, and balanced lists.
 */

import type { DeckSlide, PageDims, TwoColBlock, HeadingBlock, BulletsBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBulletItem,
  makeCard,
  makeBadge
} from '../grid'
import { wrapText } from '../measure'

export function layoutTwoColSlide(
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
  const twoColBlock = slide.blocks.find((b) => b.type === 'two-col') as TwoColBlock | undefined
  const bulletsBlock = slide.blocks.find((b) => b.type === 'bullets') as BulletsBlock | undefined

  const titleText = headingBlock?.text || 'Comparison Analysis'
  const maxWidth = page.contentWidth

  // 3. Heading
  let curY = page.marginY + 10
  if (headingBlock?.badge) {
    const bRes = makeBadge(headingBlock.badge, page.marginX, curY, tokens)
    nodes.push(...bRes.nodes)
    curY += bRes.height + 8
  }

  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 2)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h2 * 1.15) + 16

  // 4. Two Columns
  const gap = 20
  const colW = (page.contentWidth - gap) / 2
  const leftX = page.marginX
  const rightX = page.marginX + colW + gap
  const colH = Math.max(280, page.height - page.footerHeight - curY - 10)

  const leftLabel = twoColBlock?.leftLabel
  const rightLabel = twoColBlock?.rightLabel
  const leftItems = twoColBlock?.leftItems || []
  const rightItems = twoColBlock?.rightItems || []
  const leftCards = twoColBlock?.leftCards || []
  const rightCards = twoColBlock?.rightCards || []

  // If twoColBlock is not present but bullets are, split bullets between the two columns
  if (leftItems.length === 0 && rightItems.length === 0 && leftCards.length === 0 && rightCards.length === 0 && bulletsBlock) {
    const half = Math.ceil(bulletsBlock.items.length / 2)
    leftItems.push(...bulletsBlock.items.slice(0, half).map((i) => i.text))
    rightItems.push(...bulletsBlock.items.slice(half).map((i) => i.text))
  }

  // ── Render Left Column ──────────────────────────────────────────────────────
  if (leftCards.length > 0) {
    const cGap = 12
    const totalGaps = (leftCards.length - 1) * cGap
    const cH = (colH - totalGaps) / leftCards.length
    for (let i = 0; i < leftCards.length; i++) {
      const card = leftCards[i]
      const cardY = curY + i * (cH + cGap)
      const res = makeCard(leftX, cardY, colW, cH, card.title, card.body, tokens)
      nodes.push(...res.nodes)
    }
  } else if (leftItems.length > 0 || leftLabel) {
    // Draw Left Column Card Container
    nodes.push({
      kind: 'rect',
      x: leftX,
      y: curY,
      w: colW,
      h: colH,
      radius: tokens.radius.r3,
      fill: tokens.colors.surface,
      stroke: { color: tokens.colors.border, width: 0.75 }
    })

    let lY = curY + 16
    if (leftLabel) {
      const { lines: lLines } = wrapText(leftLabel, lY, {
        family: tokens.fonts.headingBold.family,
        weight: tokens.fonts.headingBold.weight,
        fontSize: tokens.type.body,
        lineHeight: 1.2,
        maxWidth: colW - 32
      })
      nodes.push({
        kind: 'text',
        x: leftX + 16,
        y: lY,
        w: colW - 32,
        lines: lLines,
        fontFamily: tokens.fonts.headingBold.family,
        fontWeight: tokens.fonts.headingBold.weight,
        fontSize: tokens.type.body,
        color: tokens.colors.text,
        lineHeight: 1.2
      })
      lY += lLines.length * Math.ceil(tokens.type.body * 1.2) + 12
    }

    const itemFontSize = leftItems.length >= 3 ? 11.5 : tokens.type.body
    const itemLh = leftItems.length >= 3 ? 1.35 : 1.45

    for (const item of leftItems) {
      if (lY >= curY + colH - 16) break
      const res = makeBulletItem(item, leftX + 4, lY, colW - 16, tokens, 0, {
        fontSize: itemFontSize,
        lineHeight: itemLh,
        indent: 14,
        bulletR: 2.5
      })
      nodes.push(...res.nodes)
      lY += res.height
    }
  }

  // ── Render Right Column ─────────────────────────────────────────────────────
  if (rightCards.length > 0) {
    const cGap = 12
    const totalGaps = (rightCards.length - 1) * cGap
    const cH = (colH - totalGaps) / rightCards.length
    for (let i = 0; i < rightCards.length; i++) {
      const card = rightCards[i]
      const cardY = curY + i * (cH + cGap)
      const res = makeCard(rightX, cardY, colW, cH, card.title, card.body, tokens)
      nodes.push(...res.nodes)
    }
  } else if (rightItems.length > 0 || rightLabel) {
    // Draw Right Column Card Container
    nodes.push({
      kind: 'rect',
      x: rightX,
      y: curY,
      w: colW,
      h: colH,
      radius: tokens.radius.r3,
      fill: tokens.colors.surface,
      stroke: { color: tokens.colors.border, width: 0.75 }
    })

    // Accent top border for right column (solution/positive)
    nodes.push({
      kind: 'rect',
      x: rightX + tokens.radius.r3,
      y: curY,
      w: colW - tokens.radius.r3 * 2,
      h: 2,
      fill: tokens.colors.accent
    })

    let rY = curY + 16
    if (rightLabel) {
      const { lines: rLines } = wrapText(rightLabel, rY, {
        family: tokens.fonts.headingBold.family,
        weight: tokens.fonts.headingBold.weight,
        fontSize: tokens.type.body,
        lineHeight: 1.2,
        maxWidth: colW - 32
      })
      nodes.push({
        kind: 'text',
        x: rightX + 16,
        y: rY,
        w: colW - 32,
        lines: rLines,
        fontFamily: tokens.fonts.headingBold.family,
        fontWeight: tokens.fonts.headingBold.weight,
        fontSize: tokens.type.body,
        color: tokens.colors.accent,
        lineHeight: 1.2
      })
      rY += rLines.length * Math.ceil(tokens.type.body * 1.2) + 12
    }

    const itemFontSize = rightItems.length >= 3 ? 11.5 : tokens.type.body
    const itemLh = rightItems.length >= 3 ? 1.35 : 1.45

    for (const item of rightItems) {
      if (rY >= curY + colH - 16) break
      const res = makeBulletItem(item, rightX + 4, rY, colW - 16, tokens, 0, {
        fontSize: itemFontSize,
        lineHeight: itemLh,
        indent: 14,
        bulletR: 2.5
      })
      nodes.push(...res.nodes)
      rY += res.height
    }
  }

  return nodes
}
