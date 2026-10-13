/**
 * OpenGamma — Cards Slide Layout Template
 *
 * Equal-height card grid (2, 3, or 4 cards), with stacked-rect depth shadows,
 * surface cards, accent top border, title, and body description.
 */

import type { DeckSlide, PageDims, CardsBlock, HeadingBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeCard
} from '../grid'

export function layoutCardsSlide(
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
  const cardsBlock = slide.blocks.find((b) => b.type === 'cards') as CardsBlock | undefined

  const titleText = headingBlock?.text || 'Key Principles'
  const maxWidth = page.contentWidth

  // 3. Heading
  let curY = page.marginY + 10
  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 1)
  nodes.push(headingNode)

  const headingHeight = headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15)
  curY += headingHeight + 28

  // 4. Cards Grid
  const cards = cardsBlock?.cards || []
  if (cards.length > 0) {
    const numCards = Math.min(4, Math.max(1, cards.length))
    const gap = 20
    const totalGaps = (numCards - 1) * gap
    const cardW = (page.contentWidth - totalGaps) / numCards

    // Calculate optimal uniform card height based on content across the row
    let maxRequiredH = 140
    for (let i = 0; i < numCards; i++) {
      const c = cards[i]
      const titleLines = Math.max(1, Math.ceil(c.title.length / Math.max(12, Math.floor(cardW / 12))))
      const bodyLines = c.body ? Math.max(1, Math.ceil(c.body.length / Math.max(18, Math.floor(cardW / 9)))) : 0
      const estH = 20 + titleLines * 24 + (c.body ? 10 + bodyLines * 18 : 0) + 20
      if (estH > maxRequiredH) maxRequiredH = estH
    }
    const maxAvailH = page.height - page.footerHeight - curY - 16
    const cardH = Math.min(maxAvailH, Math.max(160, maxRequiredH))

    for (let i = 0; i < numCards; i++) {
      const card = cards[i]
      const cardX = page.marginX + i * (cardW + gap)
      const res = makeCard(cardX, curY, cardW, cardH, card.title, card.body, tokens)
      nodes.push(...res.nodes)
    }
  }

  return nodes
}
