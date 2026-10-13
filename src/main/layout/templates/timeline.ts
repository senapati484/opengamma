/**
 * OpenGamma — Timeline Slide Layout Template
 *
 * Horizontal sequence / roadmap layout with a connecting accent line,
 * circular node indicators, phase tags, and milestones.
 */

import type { DeckSlide, PageDims, TimelineBlock, HeadingBlock } from '../../model/schema'
import type { ThemeTokens } from '../../model/themes'
import type { SceneNode } from '../primitives'
import {
  makeBackground,
  makeAccentBar,
  makeHeadingNode,
  makeBodyNode
} from '../grid'
import { wrapText } from '../measure'

export function layoutTimelineSlide(
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
  const timelineBlock = slide.blocks.find((b) => b.type === 'timeline') as TimelineBlock | undefined

  const titleText = headingBlock?.text || 'Project Roadmap'
  const maxWidth = page.contentWidth

  // 3. Heading
  let curY = page.marginY + 10
  const headingNode = makeHeadingNode(titleText, page.marginX, curY, maxWidth, page, tokens, 1)
  nodes.push(headingNode)
  curY += headingNode.lines.length * Math.ceil(tokens.type.h1 * 1.15) + 36

  // 4. Timeline
  const items = timelineBlock?.items || [
    { label: 'Phase 1', title: 'Discovery & Plan', body: 'Architecture audit and design' },
    { label: 'Phase 2', title: 'Implementation', body: 'Native engine build' },
    { label: 'Phase 3', title: 'Rollout', body: 'Verification and release' }
  ]

  const count = Math.min(5, Math.max(2, items.length))
  const stepW = maxWidth / count
  const lineY = curY + 40

  // Continuous timeline bar
  nodes.push({
    kind: 'line',
    x1: page.marginX + stepW / 2,
    y1: lineY,
    x2: page.marginX + maxWidth - stepW / 2,
    y2: lineY,
    color: tokens.colors.accent,
    width: 2,
    opacity: 0.5
  })

  // Milestones
  for (let i = 0; i < count; i++) {
    const item = items[i]
    const centerX = page.marginX + i * stepW + stepW / 2

    // Outer circle
    nodes.push({
      kind: 'circle',
      cx: centerX,
      cy: lineY,
      r: 8,
      fill: tokens.colors.surface,
      stroke: { color: tokens.colors.accent, width: 2 }
    })

    // Inner dot
    nodes.push({
      kind: 'circle',
      cx: centerX,
      cy: lineY,
      r: 3.5,
      fill: tokens.colors.accent
    })

    // Phase Label (Above line)
    const phaseFontSize = Math.max(10, tokens.type.sm - 2)
    const { lines: labelLines } = wrapText(item.label.toUpperCase(), lineY - 28, {
      family: tokens.fonts.bodySemiBold.family,
      weight: tokens.fonts.bodySemiBold.weight,
      fontSize: phaseFontSize,
      lineHeight: 1.2,
      maxWidth: stepW - 16,
      align: 'center'
    })
    nodes.push({
      kind: 'text',
      x: centerX - (stepW - 16) / 2,
      y: lineY - 28,
      w: stepW - 16,
      lines: labelLines,
      fontFamily: tokens.fonts.bodySemiBold.family,
      fontWeight: tokens.fonts.bodySemiBold.weight,
      fontSize: phaseFontSize,
      color: tokens.colors.accent,
      lineHeight: 1.2,
      tracking: 1,
      role: 'caption'
    })

    // Milestone Title (Below line)
    const { lines: titleLines, totalHeight: tH } = wrapText(item.title, lineY + 20, {
      family: tokens.fonts.headingBold.family,
      weight: tokens.fonts.headingBold.weight,
      fontSize: tokens.type.body,
      lineHeight: 1.25,
      maxWidth: stepW - 20,
      align: 'center'
    })
    nodes.push({
      kind: 'text',
      x: centerX - (stepW - 20) / 2,
      y: lineY + 20,
      w: stepW - 20,
      lines: titleLines,
      fontFamily: tokens.fonts.headingBold.family,
      fontWeight: tokens.fonts.headingBold.weight,
      fontSize: tokens.type.body,
      color: tokens.colors.text,
      lineHeight: 1.25
    })

    // Milestone description
    if (item.body) {
      const bodyNode = makeBodyNode(item.body, centerX - (stepW - 20) / 2, lineY + 20 + tH + 6, stepW - 20, tokens, {
        size: 'sm',
        align: 'center',
        color: tokens.colors.muted
      })
      nodes.push(bodyNode)
    }
  }

  return nodes
}
