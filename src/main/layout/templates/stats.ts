/**
 * OpenGamma — Stats Slide Layout Template
 *
 * Prominent metric cards with oversized accent values, metric labels,
 * and trend/delta pills (positive green / negative red).
 */

import type { DeckSlide, PageDims, StatsBlock, HeadingBlock, TextBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBodyNode,
  makeStatItem
} from '../grid'

export function layoutStatsSlide(
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
  const statsBlock = slide.blocks.find((b) => b.type === 'stats') as StatsBlock | undefined
  const textBlocks = slide.blocks.filter((b) => b.type === 'text') as TextBlock[]

  const titleText = headingBlock?.text || 'Key Metrics'
  const maxWidth = page.contentWidth

  // 3. Heading
  let curY = page.marginY + 10
  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 1)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 16

  // Subtitle / context
  if (textBlocks.length > 0) {
    const desc = textBlocks[0].text
    const bodyNode = makeBodyNode(desc, page.marginX, curY, maxWidth, tokens, {
      color: tokens.colors.muted
    })
    nodes.push(bodyNode)
    curY += bodyNode.lines.length * Math.ceil(tokens.type.body * 1.5) + 32
  } else {
    curY += 24
  }

  // 4. Stats Grid
  const stats = statsBlock?.stats || []
  if (stats.length > 0) {
    const count = Math.min(4, Math.max(1, stats.length))
    const gap = 24
    const totalGaps = (count - 1) * gap
    const statW = (page.contentWidth - totalGaps) / count
    const cardH = 180

    for (let i = 0; i < count; i++) {
      const s = stats[i]
      const statX = page.marginX + i * (statW + gap)

      // Surface card container for metric
      nodes.push({
        kind: 'rect',
        x: statX,
        y: curY,
        w: statW,
        h: cardH,
        radius: tokens.radius.r3,
        fill: tokens.colors.surface,
        stroke: { color: tokens.colors.border, width: 0.75 }
      })

      // Metric contents
      const res = makeStatItem(
        s.value,
        s.label,
        s.delta,
        s.deltaPositive,
        statX + 16,
        curY + 28,
        statW - 32,
        tokens
      )
      nodes.push(...res.nodes)
    }
  }

  return nodes
}
