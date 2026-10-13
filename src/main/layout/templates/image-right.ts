/**
 * OpenGamma — Image Right Slide Layout Template
 *
 * Heading and content/bullets column on the left,
 * Full image column on the right (with border radius and subtle scrim).
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

export function layoutImageRightSlide(
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
  const leftW = (page.contentWidth - gap) * 0.54
  const rightW = (page.contentWidth - gap) * 0.46
  const rightX = page.marginX + leftW + gap
  const topY = page.marginY + 12
  const totalH = page.height - page.footerHeight - topY

  // 2. Left Content
  let curY = topY

  // Accent bar above heading
  nodes.push(makeAccentBar(page, tokens, curY))
  curY += 16

  const titleText = headingBlock?.text || 'Featured Analysis'
  const headingNode = makeHeadingNode(titleText, page.marginX, curY, leftW, page, tokens, 1)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 20

  // Paragraphs
  for (const tb of textBlocks) {
    if (curY >= page.height - page.footerHeight - 20) break
    const bodyNode = makeBodyNode(tb.text, page.marginX, curY, leftW, tokens, {
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
      const res = makeBulletItem(item.text, page.marginX, curY, leftW, tokens, 0)
      nodes.push(...res.nodes)
      curY += res.height
    }
  }

  // 3. Right Image
  const imgSrc = imageBlock?.src || ''
  if (imgSrc) {
    nodes.push({
      kind: 'image',
      x: rightX,
      y: topY,
      w: rightW,
      h: totalH,
      src: imgSrc,
      alt: imageBlock?.alt || '',
      fit: imageBlock?.fit || 'cover',
      radius: tokens.radius.r3,
      scrim: { direction: 'bottom', intensity: 0.35 }
    })
  } else {
    nodes.push({
      kind: 'rect',
      x: rightX,
      y: topY,
      w: rightW,
      h: totalH,
      radius: tokens.radius.r3,
      fill: tokens.colors.surface,
      stroke: { color: tokens.colors.border, width: 1 }
    })
  }

  return nodes
}
