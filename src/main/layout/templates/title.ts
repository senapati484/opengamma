/**
 * OpenGamma — Title Slide Layout Template
 *
 * Full-bleed background with optional radial glow.
 * Eyebrow label, large display heading (h1), subtitle paragraph, and optional metadata/author.
 */

import type { DeckSlide, PageDims } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import { makeBackground } from '../grid'
import { wrapText } from '../measure'

export function layoutTitleSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  // Full-bleed background with dramatic center/top glow
  nodes.push(
    makeBackground(page, tokens, {
      glow: {
        cx: 0.5,
        cy: 0.45,
        radius: Math.max(page.width, page.height) * 0.6,
        opacity: 0.22
      }
    })
  )

  // Find blocks
  const headingBlock = slide.blocks.find((b) => b.type === 'heading')
  const eyebrow = headingBlock?.eyebrow
  const textBlocks = slide.blocks.filter((b) => b.type === 'text')
  const ctaBlock = slide.blocks.find((b) => b.type === 'cta')

  const titleText = headingBlock?.text || 'Untitled Presentation'
  const maxWidth = page.contentWidth * 0.88
  const startX = page.marginX + (page.contentWidth - maxWidth) / 2

  // Center vertical layout
  let curY = page.marginY + 40

  // 1. Eyebrow badge / label
  if (eyebrow) {
    const eyebrowFont = tokens.fonts.bodySemiBold
    const xsFontSize = Math.max(10, tokens.type.sm - 2)
    const { lines } = wrapText(eyebrow.toUpperCase(), curY, {
      family: eyebrowFont.family,
      weight: eyebrowFont.weight,
      fontSize: xsFontSize,
      lineHeight: 1.2,
      maxWidth,
      align: 'center'
    })

    nodes.push({
      kind: 'text',
      x: startX,
      y: curY,
      w: maxWidth,
      lines,
      fontFamily: eyebrowFont.family,
      fontWeight: eyebrowFont.weight,
      fontSize: xsFontSize,
      color: tokens.colors.accent,
      lineHeight: 1.2,
      tracking: 1.5,
      role: 'caption'
    })
    curY += 28
  }

  // 2. Large display title
  const displayHeadingFont = tokens.fonts.headingBold
  const displayFontSize = Math.min(54, tokens.type.h1 * 1.25)
  const { lines: titleLines, totalHeight: titleH } = wrapText(titleText, curY, {
    family: displayHeadingFont.family,
    weight: displayHeadingFont.weight,
    fontSize: displayFontSize,
    lineHeight: 1.12,
    maxWidth,
    align: 'center',
    maxLines: 3
  })

  nodes.push({
    kind: 'text',
    x: startX,
    y: curY,
    w: maxWidth,
    lines: titleLines,
    fontFamily: displayHeadingFont.family,
    fontWeight: displayHeadingFont.weight,
    fontSize: displayFontSize,
    color: tokens.colors.heading,
    lineHeight: 1.12,
    role: 'heading'
  })
  curY += titleH + 20

  // 3. Subtitle / paragraph
  if (textBlocks.length > 0) {
    const subtitle = textBlocks[0].text
    const subFont = tokens.fonts.body
    const subFontSize = tokens.type.h3
    const { lines: subLines, totalHeight: subH } = wrapText(subtitle, curY, {
      family: subFont.family,
      weight: subFont.weight,
      fontSize: subFontSize,
      lineHeight: 1.5,
      maxWidth: maxWidth * 0.9,
      align: 'center',
      maxLines: 3
    })

    nodes.push({
      kind: 'text',
      x: page.marginX + (page.contentWidth - maxWidth * 0.9) / 2,
      y: curY,
      w: maxWidth * 0.9,
      lines: subLines,
      fontFamily: subFont.family,
      fontWeight: subFont.weight,
      fontSize: subFontSize,
      color: tokens.colors.muted,
      lineHeight: 1.5,
      role: 'body'
    })
    curY += subH + 24
  }

  // 4. CTA button or author pill if present
  if (ctaBlock) {
    const btnW = 200
    const btnH = 40
    const btnX = page.width / 2 - btnW / 2
    nodes.push({
      kind: 'rect',
      x: btnX,
      y: curY,
      w: btnW,
      h: btnH,
      radius: tokens.radius.r2,
      fill: tokens.colors.accent
    })

    const { lines: ctaLines } = wrapText(ctaBlock.text, curY + 12, {
      family: tokens.fonts.bodySemiBold.family,
      weight: tokens.fonts.bodySemiBold.weight,
      fontSize: tokens.type.body,
      lineHeight: 1,
      maxWidth: btnW,
      align: 'center'
    })

    nodes.push({
      kind: 'text',
      x: btnX,
      y: curY + 12,
      w: btnW,
      lines: ctaLines,
      fontFamily: tokens.fonts.bodySemiBold.family,
      fontWeight: tokens.fonts.bodySemiBold.weight,
      fontSize: tokens.type.body,
      color: '#FFFFFF',
      lineHeight: 1
    })
  }

  return nodes
}
