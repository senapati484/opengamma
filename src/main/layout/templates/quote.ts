/**
 * OpenGamma — Quote Slide Layout Template
 *
 * Pull-quote layout featuring oversized quotation glyph,
 * emphasized body text, and author attribution with role.
 */

import type { DeckSlide, PageDims, QuoteBlock, HeadingBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeBodyNode
} from '../grid'
import { wrapText } from '../measure'

export function layoutQuoteSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  // 1. Background with subtle center glow
  nodes.push(
    makeBackground(page, tokens, {
      glow: {
        cx: 0.5,
        cy: 0.5,
        radius: page.width * 0.45,
        opacity: 0.15
      }
    })
  )

  const quoteBlock = slide.blocks.find((b) => b.type === 'quote') as QuoteBlock | undefined
  const headingBlock = slide.blocks.find((b) => b.type === 'heading') as HeadingBlock | undefined

  const quoteText = quoteBlock?.text || headingBlock?.text || 'Innovation distinguishes between a leader and a follower.'
  const author = quoteBlock?.author
  const role = quoteBlock?.role

  const quoteBoxW = page.contentWidth * 0.8
  const startX = page.marginX + (page.contentWidth - quoteBoxW) / 2
  let curY = page.marginY + 60

  // 2. Decorative oversized quote symbol
  const quoteGlyphFont = tokens.fonts.headingBold
  nodes.push({
    kind: 'text',
    x: startX - 20,
    y: curY - 30,
    w: 80,
    lines: [{ text: '“', xOffset: 0, y: curY - 30 }],
    fontFamily: quoteGlyphFont.family,
    fontWeight: quoteGlyphFont.weight,
    fontSize: 90,
    color: tokens.colors.accent,
    opacity: 0.35,
    lineHeight: 1
  })

  // 3. Quote body text
  const quoteFont = tokens.fonts.heading
  const quoteFontSize = Math.min(32, tokens.type.h2)
  const { lines: qLines, totalHeight: qHeight } = wrapText(quoteText, curY + 20, {
    family: quoteFont.family,
    weight: quoteFont.weight,
    fontSize: quoteFontSize,
    lineHeight: 1.45,
    maxWidth: quoteBoxW,
    align: 'left',
    maxLines: 5
  })

  nodes.push({
    kind: 'text',
    x: startX,
    y: curY + 20,
    w: quoteBoxW,
    lines: qLines,
    fontFamily: quoteFont.family,
    fontWeight: quoteFont.weight,
    fontSize: quoteFontSize,
    color: tokens.colors.heading,
    lineHeight: 1.45,
    role: 'heading'
  })
  curY += qHeight + 48

  // 4. Accent divider bar
  nodes.push({
    kind: 'rect',
    x: startX,
    y: curY,
    w: 40,
    h: 3,
    radius: tokens.radius.r1,
    fill: tokens.colors.accent
  })
  curY += 14

  // 5. Author and role
  if (author) {
    const authorNode = makeBodyNode(author, startX, curY, quoteBoxW, tokens, {
      bold: true,
      color: tokens.colors.text
    })
    nodes.push(authorNode)
    curY += 24

    if (role) {
      const roleNode = makeBodyNode(role, startX, curY, quoteBoxW, tokens, {
        size: 'sm',
        color: tokens.colors.muted
      })
      nodes.push(roleNode)
    }
  }

  return nodes
}
