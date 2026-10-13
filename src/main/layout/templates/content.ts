/**
 * OpenGamma — Content Slide Layout Template
 *
 * Heading with accent bar, followed by bullet points (with hanging indent & custom bullets),
 * paragraphs, or code snippet.
 */

  import type { DeckSlide, PageDims, BulletsBlock, HeadingBlock, TextBlock, CodeBlock, ImageBlock, CardsBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBodyNode,
  makeBulletItem,
  makeCard,
  makeBadge
} from '../grid'
import { wrapText } from '../measure'

export function layoutContentSlide(
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
  const bulletsBlock = slide.blocks.find((b) => b.type === 'bullets') as BulletsBlock | undefined
  const cardsBlock = slide.blocks.find((b) => b.type === 'cards') as CardsBlock | undefined
  const textBlocks = slide.blocks.filter((b) => b.type === 'text') as TextBlock[]
  const codeBlock = slide.blocks.find((b) => b.type === 'code') as CodeBlock | undefined
  const imageBlock = slide.blocks.find((b) => b.type === 'image') as ImageBlock | undefined

  const titleText = headingBlock?.text || 'Key Takeaways'
  const maxWidth = page.contentWidth

  // 3. Heading (H1/H2)
  let curY = page.marginY + 10
  if (headingBlock?.badge) {
    const bRes = makeBadge(headingBlock.badge, page.marginX, curY, tokens)
    nodes.push(...bRes.nodes)
    curY += bRes.height + 8
  }

  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 1)
  nodes.push(headingNode)

  const headingHeight = headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15)
  curY += headingHeight + 20

  const contentStartY = curY
  const contentMaxHeight = page.height - page.footerHeight - contentStartY

  // Check if we have an image to place side-by-side with content
  if (imageBlock && imageBlock.src) {
    const colGap = 28
    const leftW = (maxWidth - colGap) * 0.58
    const rightW = (maxWidth - colGap) * 0.42
    const rightX = page.marginX + leftW + colGap

    // Image on right
    nodes.push({
      kind: 'image',
      x: rightX,
      y: contentStartY,
      w: rightW,
      h: Math.min(contentMaxHeight, 320),
      src: imageBlock.src,
      alt: imageBlock.alt || '',
      fit: imageBlock.fit || 'cover',
      radius: tokens.radius.r3,
      scrim: imageBlock.scrim ? { direction: 'bottom', intensity: 0.4 } : undefined
    })

    // Content constrained to left column
    renderContentBlocks(leftW)
  } else {
    // Full width content
    renderContentBlocks(maxWidth)
  }

  function renderContentBlocks(availableWidth: number): void {
    const cardIdx = slide.blocks.findIndex((b) => b.type === 'cards')
    const bulletIdx = slide.blocks.findIndex((b) => b.type === 'bullets')

    const renderCards = () => {
      if (cardsBlock && cardsBlock.cards.length > 0) {
        const numCards = Math.min(3, cardsBlock.cards.length)
        const gap = 16
        const cardW = (availableWidth - (numCards - 1) * gap) / numCards
        let maxCardH = 0

        for (let i = 0; i < numCards; i++) {
          if (curY >= page.height - page.footerHeight - 30) break
          const card = cardsBlock.cards[i]
          const cardX = page.marginX + i * (cardW + gap)
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

          const res = makeBulletItem(item, page.marginX, curY, availableWidth, tokens, 0, {
            fontSize: bFontSize,
            lineHeight: bLh,
            indent: 14,
            bulletR: 2.5
          })
          nodes.push(...res.nodes)
          curY += res.height

          // Sub-bullets
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              if (curY >= page.height - page.footerHeight - 16) break
              const subRes = makeBulletItem(child, page.marginX, curY, availableWidth, tokens, 1, {
                fontSize: bFontSize - 1,
                lineHeight: bLh,
                indent: 28,
                bulletR: 2
              })
              nodes.push(...subRes.nodes)
              curY += subRes.height
            }
          }
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

    // 5. Paragraphs
    for (const tb of textBlocks) {
      if (curY >= page.height - page.footerHeight - 20) break
      const bodyNode = makeBodyNode(tb.text, page.marginX, curY, availableWidth, tokens, {
        size: tb.size || 'md',
        align: tb.align || 'left'
      })
      nodes.push(bodyNode)
      curY += bodyNode.lines.length * Math.ceil(tokens.type.body * 1.5) + 16
    }

    // 6. Code snippet if present
    if (codeBlock && codeBlock.code) {
      const codeBoxH = Math.min(180, page.height - page.footerHeight - curY - 10)
      if (codeBoxH > 40) {
        // Code container background
        nodes.push({
          kind: 'rect',
          x: page.marginX,
          y: curY,
          w: availableWidth,
          h: codeBoxH,
          radius: tokens.radius.r2,
          fill: '#0D1117',
          stroke: { color: tokens.colors.border, width: 0.75 }
        })

        const codeFont = tokens.fonts.mono
        const codeFontSize = tokens.type.mono || 11
        const { lines } = wrapText(codeBlock.code, curY + 12, {
          family: codeFont.family,
          weight: codeFont.weight,
          fontSize: codeFontSize,
          lineHeight: 1.4,
          maxWidth: availableWidth - 24,
          maxLines: Math.floor((codeBoxH - 24) / (codeFontSize * 1.4))
        })

        nodes.push({
          kind: 'text',
          x: page.marginX + 14,
          y: curY + 12,
          w: availableWidth - 24,
          lines,
          fontFamily: codeFont.family,
          fontWeight: codeFont.weight,
          fontSize: codeFontSize,
          color: '#E6EDF3',
          lineHeight: 1.4,
          role: 'code'
        })
      }
    }
  }

  return nodes
}
