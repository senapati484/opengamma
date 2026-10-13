/**
 * OpenGamma — Image Left Slide Layout Template
 *
 * Full image column on the left (with border radius and subtle scrim),
 * Heading and content/bullets column on the right.
 */

import type { DeckSlide, PageDims, ImageBlock, HeadingBlock, BulletsBlock, TextBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBodyNode,
  makeBulletItem
} from '../grid'

export function layoutImageLeftSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  // 1. Background
  nodes.push(makeBackground(page, tokens))

  // Find blocks
  const headingBlock = slide.blocks.find((b) => b.type === 'heading') as HeadingBlock | undefined
  const imageBlock = slide.blocks.find((b) => b.type === 'image') as ImageBlock | undefined
  const bulletsBlock = slide.blocks.find((b) => b.type === 'bullets') as BulletsBlock | undefined
  const textBlocks = slide.blocks.filter((b) => b.type === 'text') as TextBlock[]

  const gap = 32
  const leftW = (page.contentWidth - gap) * 0.46
  const rightW = (page.contentWidth - gap) * 0.54
  const rightX = page.marginX + leftW + gap
  const topY = page.marginY + 12
  const totalH = page.height - page.footerHeight - topY

  // 2. Left Image
  const imgSrc = imageBlock?.src || ''
  if (imgSrc) {
    nodes.push({
      kind: 'image',
      x: page.marginX,
      y: topY,
      w: leftW,
      h: totalH,
      src: imgSrc,
      alt: imageBlock?.alt || '',
      fit: imageBlock?.fit || 'cover',
      radius: tokens.radius.r3,
      scrim: { direction: 'bottom', intensity: 0.35 }
    })
  } else {
    // Elegant placeholder card
    nodes.push({
      kind: 'rect',
      x: page.marginX,
      y: topY,
      w: leftW,
      h: totalH,
      radius: tokens.radius.r3,
      fill: tokens.colors.surface,
      stroke: { color: tokens.colors.border, width: 1 }
    })
  }

  // 3. Right Content
  let curY = topY

  // Accent bar above heading
  nodes.push(makeAccentBar(page, tokens, curY))
  curY += 16

  const titleText = headingBlock?.text || 'Visual Overview'
  const headingNode = makeHeadingNode(titleText, rightX, curY, rightW, page, tokens, 1)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 20

  // Paragraphs
  for (const tb of textBlocks) {
    if (curY >= page.height - page.footerHeight - 20) break
    const bodyNode = makeBodyNode(tb.text, rightX, curY, rightW, tokens, {
      size: tb.size || 'md',
      align: tb.align || 'left'
    })
    nodes.push(bodyNode)
    curY += bodyNode.lines.length * Math.ceil(tokens.type.body * 1.5) + 14
  }

  // Bullets
  if (bulletsBlock && bulletsBlock.items.length > 0) {
    for (const item of bulletsBlock.items) {
      if (curY >= page.height - page.footerHeight - 20) break
      const res = makeBulletItem(item.text, rightX, curY, rightW, tokens, 0)
      nodes.push(...res.nodes)
      curY += res.height
    }
  }

  return nodes
}
