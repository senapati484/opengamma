/**
 * OpenGamma — Slide Layout Engine Orchestrator
 *
 * Takes a typed DeckSlide, ThemeTokens, and PageDims, and computes
 * an exact scene graph (RenderedSlide with SceneNode[]) for PDF rendering.
 */

import type { DeckSlide, PageDims } from '../model/schema'
import type { ThemeTokens } from '../model/themes'
import type { RenderedSlide, SceneNode } from './primitives'
import { makePageNumber } from './grid'

import { layoutTitleSlide } from './templates/title'
import { layoutSectionSlide } from './templates/section'
import { layoutContentSlide } from './templates/content'
import { layoutTwoColSlide } from './templates/two-col'
import { layoutImageLeftSlide } from './templates/image-left'
import { layoutImageRightSlide } from './templates/image-right'
import { layoutCardsSlide } from './templates/cards'
import { layoutStatsSlide } from './templates/stats'
import { layoutQuoteSlide } from './templates/quote'
import { layoutTableSlide } from './templates/table'
import { layoutTimelineSlide } from './templates/timeline'
import { layoutClosingSlide } from './templates/closing'
import { layoutBlankSlide } from './templates/blank'

export interface LayoutOptions {
  showPageNumbers?: boolean
}

export function layoutSlide(
  slide: DeckSlide,
  tokens: ThemeTokens,
  page: PageDims,
  index = 0,
  total = 1,
  options: LayoutOptions = {}
): RenderedSlide {
  let nodes: SceneNode[] = []

  switch (slide.layout) {
    case 'title':
      nodes = layoutTitleSlide(slide, tokens, page)
      break
    case 'section':
      nodes = layoutSectionSlide(slide, tokens, page, index)
      break
    case 'content':
      nodes = layoutContentSlide(slide, tokens, page)
      break
    case 'two-col':
      nodes = layoutTwoColSlide(slide, tokens, page)
      break
    case 'image-left':
      nodes = layoutImageLeftSlide(slide, tokens, page)
      break
    case 'image-right':
      nodes = layoutImageRightSlide(slide, tokens, page)
      break
    case 'cards':
      nodes = layoutCardsSlide(slide, tokens, page)
      break
    case 'stats':
      nodes = layoutStatsSlide(slide, tokens, page)
      break
    case 'quote':
      nodes = layoutQuoteSlide(slide, tokens, page)
      break
    case 'table':
      nodes = layoutTableSlide(slide, tokens, page)
      break
    case 'timeline':
      nodes = layoutTimelineSlide(slide, tokens, page)
      break
    case 'closing':
      nodes = layoutClosingSlide(slide, tokens, page)
      break
    case 'blank':
    default:
      nodes = layoutBlankSlide(slide, tokens, page)
      break
  }

  // Page numbers on content slides (suppressed on title and closing)
  const isTitle = slide.layout === 'title' || index === 0
  const isClosing = slide.layout === 'closing' || (total > 1 && index === total - 1)
  const showPageNumbers = options.showPageNumbers !== false && slide.slideNumberOverride !== 'hidden'

  if (showPageNumbers && !isTitle && !isClosing) {
    const pageNumNode = makePageNumber(
      typeof slide.slideNumberOverride === 'number' ? slide.slideNumberOverride : index + 1,
      total,
      page,
      tokens
    )
    nodes.push(pageNumNode)
  }

  return {
    nodes,
    width: page.width,
    height: page.height
  }
}

export * from './primitives'
export * from './grid'
export * from './measure'
