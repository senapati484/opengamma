/**
 * OpenGamma — Section Divider Slide Layout Template
 *
 * Section breaker slide with prominent oversized section index numeral
 * in low-opacity accent color, bold H1 section title, and optional description.
 */

import type { DeckSlide, PageDims, HeadingBlock, TextBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeBodyNode
} from '../grid'
import { wrapText } from '../measure'

export function layoutSectionSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims,
  slideIndex: number
): SceneNode[] {
  const nodes: SceneNode[] = []

  // 1. Background with corner accent glow
  nodes.push(
    makeBackground(page, tokens, {
      glow: {
        cx: 0.15,
        cy: 0.35,
        radius: page.width * 0.5,
        opacity: 0.2
      }
    })
  )

  const headingBlock = slide.blocks.find((b) => b.type === 'heading') as HeadingBlock | undefined
  const textBlocks = slide.blocks.filter((b) => b.type === 'text') as TextBlock[]

  const titleText = headingBlock?.text || 'Next Section'
  const maxWidth = page.contentWidth * 0.8
  const startX = page.marginX

  let curY = page.marginY + 60

  // 2. Large translucent section number (e.g. "02")
  const sectionNum = String(slideIndex + 1).padStart(2, '0')
  const numFont = tokens.fonts.headingBold
  nodes.push({
    kind: 'text',
    x: startX,
    y: curY - 20,
    w: 240,
    lines: [{ text: sectionNum, xOffset: 0, y: curY - 20 }],
    fontFamily: numFont.family,
    fontWeight: numFont.weight,
    fontSize: 84,
    color: tokens.colors.accent,
    opacity: 0.25,
    lineHeight: 1
  })
  curY += 70

  // 3. Accent bar
  nodes.push(makeAccentBar(page, tokens, curY))
  curY += 16

  // 4. Section Title (H1)
  const headingFont = tokens.fonts.headingBold
  const headingFontSize = tokens.type.h1 * 1.15
  const { lines: hLines, totalHeight: hHeight } = wrapText(titleText, curY, {
    family: headingFont.family,
    weight: headingFont.weight,
    fontSize: headingFontSize,
    lineHeight: 1.15,
    maxWidth,
    maxLines: 2
  })

  nodes.push({
    kind: 'text',
    x: startX,
    y: curY,
    w: maxWidth,
    lines: hLines,
    fontFamily: headingFont.family,
    fontWeight: headingFont.weight,
    fontSize: headingFontSize,
    color: tokens.colors.heading,
    lineHeight: 1.15,
    role: 'heading'
  })
  curY += hHeight + 20

  // 5. Description
  if (textBlocks.length > 0) {
    const desc = textBlocks[0].text
    const bodyNode = makeBodyNode(desc, startX, curY, maxWidth, tokens, {
      size: 'lg',
      color: tokens.colors.muted
    })
    nodes.push(bodyNode)
  }

  return nodes
}
