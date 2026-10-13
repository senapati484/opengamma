/**
 * OpenGamma — Closing Slide Layout Template
 *
 * Final presentation slide, centering concluding remarks,
 * calls to action (CTA), website, email, or contact credentials.
 */

import type { DeckSlide, PageDims, HeadingBlock, TextBlock, CtaBlock, CardsBlock, BulletsBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeBodyNode,
  makeBulletItem,
  makeCard,
  makeBadge
} from '../grid'
import { wrapText } from '../measure'

export function layoutClosingSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  const headingBlock = slide.blocks.find((b) => b.type === 'heading') as HeadingBlock | undefined
  const textBlocks = slide.blocks.filter((b) => b.type === 'text') as TextBlock[]
  const ctaBlock = slide.blocks.find((b) => b.type === 'cta') as CtaBlock | undefined
  const cardsBlock = slide.blocks.find((b) => b.type === 'cards') as CardsBlock | undefined
  const bulletsBlock = slide.blocks.find((b) => b.type === 'bullets') as BulletsBlock | undefined

  const hasRichContent = !!cardsBlock || !!bulletsBlock

  // 1. Background
  if (!hasRichContent) {
    nodes.push(
      makeBackground(page, tokens, {
        glow: {
          cx: 0.5,
          cy: 0.45,
          radius: Math.max(page.width, page.height) * 0.55,
          opacity: 0.2
        }
      })
    )
  } else {
    nodes.push(makeBackground(page, tokens))
    nodes.push(makeAccentBar(page, tokens))
  }

  const titleText = headingBlock?.text || 'Thank You'
  const maxWidth = hasRichContent ? page.contentWidth : page.contentWidth * 0.85
  const startX = hasRichContent ? page.marginX : page.marginX + (page.contentWidth - maxWidth) / 2

  let curY = hasRichContent ? page.marginY + 10 : page.marginY + 60

  // Optional Badge
  if (headingBlock?.badge) {
    const bRes = makeBadge(headingBlock.badge, startX, curY, tokens)
    nodes.push(...bRes.nodes)
    curY += bRes.height + 8
  }

  // 2. Concluding Title
  const titleFont = tokens.fonts.headingBold
  const titleFontSize = hasRichContent ? tokens.type.h2 : Math.min(48, tokens.type.h1 * 1.15)
  const { lines: tLines, totalHeight: tHeight } = wrapText(titleText, curY, {
    family: titleFont.family,
    weight: titleFont.weight,
    fontSize: titleFontSize,
    lineHeight: 1.15,
    maxWidth,
    align: hasRichContent ? 'left' : 'center',
    maxLines: 2
  })

  nodes.push({
    kind: 'text',
    x: startX,
    y: curY,
    w: maxWidth,
    lines: tLines,
    fontFamily: titleFont.family,
    fontWeight: titleFont.weight,
    fontSize: titleFontSize,
    color: tokens.colors.heading,
    lineHeight: 1.15,
    role: 'heading'
  })
  curY += tHeight + (hasRichContent ? 12 : 20)

  // 3. Subtext / Lead paragraph
  if (textBlocks.length > 0) {
    const subtitle = textBlocks[0].text
    const subNode = makeBodyNode(subtitle, startX, curY, maxWidth, tokens, {
      size: hasRichContent ? 'md' : 'lg',
      align: hasRichContent ? 'left' : 'center',
      color: tokens.colors.muted
    })
    nodes.push(subNode)
    curY += subNode.lines.length * Math.ceil(tokens.type.body * 1.45) + (hasRichContent ? 16 : 28)
  }

  const cardIdx = slide.blocks.findIndex((b) => b.type === 'cards')
  const bulletIdx = slide.blocks.findIndex((b) => b.type === 'bullets')

  const renderCards = () => {
    if (cardsBlock && cardsBlock.cards.length > 0) {
      const numCards = Math.min(3, cardsBlock.cards.length)
      const gap = 16
      const cardW = (maxWidth - (numCards - 1) * gap) / numCards
      let maxCardH = 0

      for (let i = 0; i < numCards; i++) {
        if (curY >= page.height - page.footerHeight - 30) break
        const card = cardsBlock.cards[i]
        const cardX = startX + i * (cardW + gap)
        const res = makeCard(cardX, curY, cardW, 60, card.title, card.body, tokens)
        nodes.push(...res.nodes)
        maxCardH = Math.max(maxCardH, res.height)
      }
      if (maxCardH > 0) {
        curY += maxCardH + 16
      }
    }
  }

  const renderBullets = () => {
    if (bulletsBlock && bulletsBlock.items.length > 0) {
      const bFontSize = bulletsBlock.items.length >= 4 ? 11.5 : tokens.type.body
      const bLh = bulletsBlock.items.length >= 4 ? 1.35 : 1.45
      for (const item of bulletsBlock.items) {
        if (curY >= page.height - page.footerHeight - 20) break
        const res = makeBulletItem(item, startX, curY, maxWidth, tokens, 0, {
          fontSize: bFontSize,
          lineHeight: bLh,
          indent: 14,
          bulletR: 2.5
        })
        nodes.push(...res.nodes)
        curY += res.height
      }
    }
  }

  if (bulletIdx !== -1 && (cardIdx === -1 || bulletIdx < cardIdx)) {
    renderBullets()
    renderCards()
  } else {
    renderCards()
    renderBullets()
  }

  // 6. CTA Pill if present
  if (ctaBlock) {
    const ctaText = ctaBlock.text || 'Get Started'
    const btnW = 200
    const btnH = 40
    const btnX = hasRichContent ? startX : page.width / 2 - btnW / 2

    if (curY + btnH <= page.height - page.footerHeight) {
      nodes.push({
        kind: 'rect',
        x: btnX,
        y: curY,
        w: btnW,
        h: btnH,
        radius: tokens.radius.r2,
        fill: tokens.colors.accent
      })

      const { lines: ctaLines } = wrapText(ctaText, curY + 13, {
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
        y: curY + 13,
        w: btnW,
        lines: ctaLines,
        fontFamily: tokens.fonts.bodySemiBold.family,
        fontWeight: tokens.fonts.bodySemiBold.weight,
        fontSize: tokens.type.body,
        color: '#FFFFFF',
        lineHeight: 1
      })
    }
  }

  return nodes
}
