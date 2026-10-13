/**
 * OpenGamma — Structured Deck Model
 * The single source of truth for PDF, PPTX, HTML, and PNG exports.
 * All slide content is represented as typed blocks, never raw HTML.
 */

import { z } from 'zod'

// ─── Primitive types ──────────────────────────────────────────────────────────

export const ColorZ = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\(/)

export const GradientStopZ = z.object({
  position: z.number().min(0).max(1),
  color: z.string(),
  opacity: z.number().min(0).max(1).default(1)
})

export const GradientZ = z.object({
  kind: z.literal('linear'),
  angle: z.number().default(135),
  stops: z.array(GradientStopZ)
})

export type Gradient = z.infer<typeof GradientZ>
export type GradientStop = z.infer<typeof GradientStopZ>

// ─── Block types (content atoms) ─────────────────────────────────────────────

/**
 * A single heading — maps to h1/h2/h3 in HTML, styled per level in PDF.
 */
export const HeadingBlockZ = z.object({
  type: z.literal('heading'),
  text: z.string(),
  level: z.number().int().min(1).max(3).default(1),
  /** Optional eyebrow label rendered above the heading in small caps */
  eyebrow: z.string().optional(),
  /** Optional pill badge rendered beside or under heading */
  badge: z.string().optional()
})

/**
 * A simple text paragraph or subtitle.
 */
export const TextBlockZ = z.object({
  type: z.literal('text'),
  text: z.string(),
  /** Size scale: 'sm' = caption, 'md' = body, 'lg' = subheading */
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  align: z.enum(['left', 'center', 'right']).default('left')
})

/**
 * A bullet list — optionally nested one level.
 */
export const BulletItemZ = z.object({
  text: z.string(),
  /** Optional bold title prefix (e.g. "Hardware Interaction" from "Hardware Interaction — ...") */
  title: z.string().optional(),
  /** Optional body description following the title */
  body: z.string().optional(),
  /** Optional nested sub-bullets (max one level deep) */
  children: z.array(z.string()).optional()
})

export const BulletsBlockZ = z.object({
  type: z.literal('bullets'),
  items: z.array(BulletItemZ)
})

/**
 * A single card in a card grid. Icon is an SVG path string or emoji.
 */
export const CardZ = z.object({
  title: z.string(),
  body: z.string().optional(),
  icon: z.string().optional(),
  accentLine: z.string().optional()
})

export const CardsBlockZ = z.object({
  type: z.literal('cards'),
  cards: z.array(CardZ).min(1).max(6),
  /** Explicit column count; defaults to cards.length (max 4) */
  columns: z.number().int().min(1).max(4).optional()
})

/**
 * A stat metric — big bold number + label + optional delta.
 */
export const StatItemZ = z.object({
  value: z.string(),
  label: z.string(),
  delta: z.string().optional(),
  deltaPositive: z.boolean().optional()
})

export const StatsBlockZ = z.object({
  type: z.literal('stats'),
  stats: z.array(StatItemZ).min(1).max(4)
})

/**
 * A pull-quote with optional author attribution.
 */
export const QuoteBlockZ = z.object({
  type: z.literal('quote'),
  text: z.string(),
  author: z.string().optional(),
  role: z.string().optional()
})

/**
 * An image — either a resolved URL/data-URI or a placeholder prompt.
 */
export const ImageBlockZ = z.object({
  type: z.literal('image'),
  src: z.string(),
  /** Alt text for accessibility and PDF metadata */
  alt: z.string().default(''),
  /** How to fit the image within its container */
  fit: z.enum(['cover', 'contain']).default('cover'),
  /** Whether to clip to rounded corners */
  rounded: z.boolean().default(true),
  /** If true, a dark gradient scrim is drawn over the image */
  scrim: z.boolean().default(false)
})

/**
 * A table with a header row and data rows.
 */
export const TableBlockZ = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
})

/**
 * A two-column comparison (e.g. Before / After, Problem / Solution).
 */
export const TwoColBlockZ = z.object({
  type: z.literal('two-col'),
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  leftItems: z.array(z.string()).default([]),
  rightItems: z.array(z.string()).default([]),
  leftCards: z.array(CardZ).optional(),
  rightCards: z.array(CardZ).optional()
})

/**
 * A CTA / action button.
 */
export const CtaBlockZ = z.object({
  type: z.literal('cta'),
  text: z.string(),
  subtext: z.string().optional()
})

/**
 * A code snippet block.
 */
export const CodeBlockZ = z.object({
  type: z.literal('code'),
  code: z.string(),
  language: z.string().default(''),
  caption: z.string().optional()
})

/**
 * A timeline of events.
 */
export const TimelineItemZ = z.object({
  label: z.string(),
  title: z.string(),
  body: z.string().optional()
})

export const TimelineBlockZ = z.object({
  type: z.literal('timeline'),
  items: z.array(TimelineItemZ).min(2).max(6)
})

/**
 * A spacer (vertical whitespace).
 */
export const SpacerBlockZ = z.object({
  type: z.literal('spacer'),
  height: z.number().min(4).max(120).default(24)
})

// All block types as a discriminated union
export const BlockZ = z.discriminatedUnion('type', [
  HeadingBlockZ,
  TextBlockZ,
  BulletsBlockZ,
  CardsBlockZ,
  StatsBlockZ,
  QuoteBlockZ,
  ImageBlockZ,
  TableBlockZ,
  TwoColBlockZ,
  CtaBlockZ,
  CodeBlockZ,
  TimelineBlockZ,
  SpacerBlockZ
])

export type Block = z.infer<typeof BlockZ>
export type HeadingBlock = z.infer<typeof HeadingBlockZ>
export type TextBlock = z.infer<typeof TextBlockZ>
export type BulletsBlock = z.infer<typeof BulletsBlockZ>
export type BulletItem = z.infer<typeof BulletItemZ>
export type CardsBlock = z.infer<typeof CardsBlockZ>
export type Card = z.infer<typeof CardZ>
export type StatsBlock = z.infer<typeof StatsBlockZ>
export type StatItem = z.infer<typeof StatItemZ>
export type QuoteBlock = z.infer<typeof QuoteBlockZ>
export type ImageBlock = z.infer<typeof ImageBlockZ>
export type TableBlock = z.infer<typeof TableBlockZ>
export type TwoColBlock = z.infer<typeof TwoColBlockZ>
export type CtaBlock = z.infer<typeof CtaBlockZ>
export type CodeBlock = z.infer<typeof CodeBlockZ>
export type TimelineBlock = z.infer<typeof TimelineBlockZ>
export type SpacerBlock = z.infer<typeof SpacerBlockZ>

// ─── Slide layouts ────────────────────────────────────────────────────────────

export const LayoutZ = z.enum([
  'title',       // Display title + subtitle, full-bleed background
  'section',     // Section divider with large number accent
  'content',     // Heading + bullet list (most common)
  'two-col',     // Two-column comparison
  'image-left',  // Full-bleed image left + text right
  'image-right', // Full-bleed image right + text left
  'cards',       // Equal-height card grid
  'stats',       // Metrics display
  'quote',       // Pull-quote
  'table',       // Data table
  'timeline',    // Horizontal timeline
  'closing',     // Mirror of title, with CTA
  'blank'        // Empty canvas
])

export type Layout = z.infer<typeof LayoutZ>

// ─── Slide background ─────────────────────────────────────────────────────────

export const BackgroundZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('theme') }),
  z.object({ kind: z.literal('solid'), color: z.string() }),
  z.object({ kind: z.literal('gradient'), gradient: GradientZ }),
  z.object({ kind: z.literal('image'), src: z.string(), scrim: z.boolean().default(true) })
])

export type SlideBackground = z.infer<typeof BackgroundZ>

// ─── Slide ────────────────────────────────────────────────────────────────────

export const DeckSlideZ = z.object({
  id: z.string(),
  layout: LayoutZ,
  background: BackgroundZ.optional(),
  blocks: z.array(BlockZ),
  /** Speaker notes — exported to PDF outline, not visible on slide */
  notes: z.string().optional(),
  /** Slide number override (null = auto-increment, 'hidden' = suppress) */
  slideNumberOverride: z.union([z.number(), z.literal('hidden')]).optional()
})

export type DeckSlide = z.infer<typeof DeckSlideZ>

// ─── Deck (entire presentation) ───────────────────────────────────────────────

export const DeckMetaZ = z.object({
  title: z.string(),
  author: z.string().optional(),
  subject: z.string().optional(),
  lang: z.string().default('en'),
  createdAt: z.string().optional()
})

export const DeckZ = z.object({
  schemaVersion: z.literal(1),
  meta: DeckMetaZ,
  themeId: z.string(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  slides: z.array(DeckSlideZ)
})

export type Deck = z.infer<typeof DeckZ>
export type DeckMeta = z.infer<typeof DeckMetaZ>

// ─── Page dimensions (derived from aspect ratio) ──────────────────────────────

export interface PageDims {
  width: number
  height: number
  marginX: number
  marginY: number
  footerHeight: number
  contentWidth: number
  contentHeight: number
}

export function getPageDims(aspectRatio: '16:9' | '9:16' | '1:1' = '16:9'): PageDims {
  const dims: Record<string, { width: number; height: number }> = {
    '16:9': { width: 960, height: 540 },
    '9:16': { width: 540, height: 960 },
    '1:1': { width: 720, height: 720 }
  }
  const { width, height } = dims[aspectRatio]
  const marginX = 56
  const marginY = 52
  const footerHeight = 36
  return {
    width,
    height,
    marginX,
    marginY,
    footerHeight,
    contentWidth: width - marginX * 2,
    contentHeight: height - marginY - footerHeight
  }
}
