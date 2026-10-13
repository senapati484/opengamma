/**
 * OpenGamma — Blank / Fallback Slide Layout Template
 *
 * Renders arbitrary sequence of blocks gracefully.
 */

import type { DeckSlide, PageDims } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBodyNode,
  makeBulletItem
} from '../grid'

export function layoutBlankSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims
): SceneNode[] {
  const nodes: SceneNode[] = []

  // 1. Background
  nodes.push(makeBackground(page, tokens))

  let curY = page.marginY + 10
  const maxWidth = page.contentWidth

  for (const block of slide.blocks) {
    if (curY >= page.height - page.footerHeight - 20) break

    switch (block.type) {
      case 'heading': {
        nodes.push(makeAccentBar(page, tokens, curY))
        curY += 16
        const headingNode = makeHeadingNode(block.text, page.marginX, curY, maxWidth, page, tokens, block.level as any)
        nodes.push(headingNode)
        curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 16
        break
      }
      case 'text': {
        const bodyNode = makeBodyNode(block.text, page.marginX, curY, maxWidth, tokens, {
          size: block.size,
          align: block.align
        })
        nodes.push(bodyNode)
        curY += bodyNode.lines.length * Math.ceil(tokens.type.body * 1.5) + 14
        break
      }
      case 'bullets': {
        for (const item of block.items) {
          if (curY >= page.height - page.footerHeight - 20) break
          const res = makeBulletItem(item.text, page.marginX, curY, maxWidth, tokens, 0)
          nodes.push(...res.nodes)
          curY += res.height
        }
        break
      }
      case 'image': {
        if (block.src) {
          const imgH = Math.min(240, page.height - page.footerHeight - curY - 10)
          if (imgH > 60) {
            nodes.push({
              kind: 'image',
              x: page.marginX,
              y: curY,
              w: maxWidth,
              h: imgH,
              src: block.src,
              alt: block.alt || '',
              fit: block.fit || 'contain',
              radius: tokens.radius.r2
            })
            curY += imgH + 16
          }
        }
        break
      }
      default:
        break
    }
  }

  return nodes
}
