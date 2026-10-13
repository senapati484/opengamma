/**
 * OpenGamma — Layout Grid & Common Helpers
 *
 * 12-column grid system, page constants, shared drawing helpers
 * used by all layout templates.
 */

import type { PageDims } from '../model/schema'
import type { ThemeTokens } from '../model/themes'
import type {
  BackgroundNode,
  RectNode,
  TextNode,
  CircleNode,
  LineNode,
  PageNumberNode,
  SceneNode
} from './primitives'
import { wrapText, measureTextWidth } from './measure'

// ─── Grid ─────────────────────────────────────────────────────────────────────

const GRID_COLUMNS = 12
const GUTTER = 20  // gap between columns in points

/**
 * Convert column index + span to absolute { x, width } in a given page.
 * Columns are 0-indexed. Column widths are calculated within the content area.
 */
export function col(
  page: PageDims,
  colIndex: number,
  span: number
): { x: number; width: number } {
  const totalGutters = (GRID_COLUMNS - 1) * GUTTER
  const colWidth = (page.contentWidth - totalGutters) / GRID_COLUMNS
  const x = page.marginX + colIndex * (colWidth + GUTTER)
  const width = span * colWidth + (span - 1) * GUTTER
  return { x, width }
}

/**
 * Shorthand: start x of a column range, full width from colStart to colEnd.
 */
export function colRange(
  page: PageDims,
  colStart: number,
  colEnd: number  // inclusive
): { x: number; width: number } {
  return col(page, colStart, colEnd - colStart + 1)
}

/**
 * Content area top (below top margin, accounting for accent bar on content slides).
 */
export function contentTop(page: PageDims, hasAccentBar = false): number {
  return page.marginY + (hasAccentBar ? 16 : 0)
}

/**
 * Content area bottom (above footer zone).
 */
export function contentBottom(page: PageDims): number {
  return page.height - page.footerHeight
}

/**
 * The safe content rect for most slide layouts.
 */
export function contentRect(page: PageDims): { x: number; y: number; w: number; h: number } {
  return {
    x: page.marginX,
    y: page.marginY,
    w: page.contentWidth,
    h: page.contentHeight
  }
}

// ─── Background ───────────────────────────────────────────────────────────────

export function makeBackground(
  page: PageDims,
  tokens: ThemeTokens,
  opts: {
    glow?: { cx: number; cy: number; radius: number; opacity?: number }
  } = {}
): BackgroundNode {
  const fill: BackgroundNode['fill'] = tokens.colors.bgGradient
    ? {
        kind: 'linearGradient',
        x1: 0,
        y1: 0,
        x2: gradientX2(tokens.colors.bgGradient.angle, page.width),
        y2: gradientY2(tokens.colors.bgGradient.angle, page.height),
        stops: tokens.colors.bgGradient.stops.map((s) => ({
          position: s.position,
          color: s.color,
          opacity: s.opacity
        }))
      }
    : tokens.colors.bg

  return {
    kind: 'background',
    fill,
    glow: opts.glow
      ? {
          cx: opts.glow.cx,
          cy: opts.glow.cy,
          radius: opts.glow.radius,
          color: tokens.colors.accent,
          opacity: opts.glow.opacity ?? 0.18
        }
      : undefined
  }
}

function gradientX2(angle: number, width: number): number {
  return width * Math.sin((angle * Math.PI) / 180)
}

function gradientY2(angle: number, height: number): number {
  return height * Math.cos((angle * Math.PI) / 180)
}

// ─── Accent bar ───────────────────────────────────────────────────────────────

/**
 * The 48×4pt accent bar drawn above H1 on content slides.
 */
export function makeAccentBar(
  page: PageDims,
  tokens: ThemeTokens,
  yOverride?: number
): RectNode {
  return {
    kind: 'rect',
    x: page.marginX,
    y: yOverride ?? page.marginY - 8,
    w: 48,
    h: 4,
    radius: tokens.radius.r1,
    fill: tokens.colors.accent
  }
}

// ─── Heading text node ────────────────────────────────────────────────────────

export function makeHeadingNode(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  _page: PageDims,
  tokens: ThemeTokens,
  level: 1 | 2 | 3 = 1
): TextNode {
  const fontFamily = tokens.fonts.headingBold.family
  const fontWeight = tokens.fonts.headingBold.weight
  const fontSize = level === 1 ? tokens.type.h1 : level === 2 ? tokens.type.h2 : tokens.type.h3
  const maxLines = level === 1 ? 3 : level === 2 ? 4 : 5

  const { lines } = wrapText(text, y, {
    family: fontFamily,
    weight: fontWeight,
    fontSize,
    lineHeight: 1.15,
    maxWidth,
    maxLines
  })

  return {
    kind: 'text',
    x,
    y,
    w: maxWidth,
    lines,
    fontFamily,
    fontWeight,
    fontSize,
    color: tokens.headingIsGradientClip ? tokens.colors.heading : tokens.headingColor,
    lineHeight: 1.15,
    role: level === 1 ? 'heading' : 'heading'
  }
}

// ─── Pill Badge node ─────────────────────────────────────────────────────────

export function makeBadge(
  text: string,
  x: number,
  y: number,
  tokens: ThemeTokens
): { nodes: SceneNode[]; width: number; height: number } {
  const fontSize = 9
  const font = tokens.fonts.bodySemiBold
  const h = 20
  const padX = 10
  const textW = measureTextWidth(text, font.family, font.weight, fontSize)
  const w = textW + padX * 2

  const rectNode: RectNode = {
    kind: 'rect',
    x,
    y,
    w,
    h,
    radius: 10,
    fill: tokens.colors.surface,
    stroke: { color: tokens.colors.border, width: 0.75 }
  }

  const textNode: TextNode = {
    kind: 'text',
    x: x + padX,
    y: y + 4.5,
    w: textW,
    lines: [{ text, xOffset: 0, y: y + 4.5 }],
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize,
    color: tokens.colors.accent,
    lineHeight: 1
  }

  return { nodes: [rectNode, textNode], width: w, height: h }
}

// ─── Body text node ───────────────────────────────────────────────────────────

export function makeBodyNode(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  tokens: ThemeTokens,
  opts: {
    size?: 'sm' | 'md' | 'lg'
    align?: 'left' | 'center' | 'right'
    color?: string
    maxLines?: number
    bold?: boolean
  } = {}
): TextNode {
  const { size = 'md', align = 'left', color, maxLines, bold = false } = opts
  const fontSize = size === 'sm' ? tokens.type.sm : size === 'lg' ? tokens.type.h3 : tokens.type.body
  const fontWeight = bold ? tokens.fonts.bodySemiBold.weight : tokens.fonts.body.weight
  const fontFamily = tokens.fonts.body.family

  const { lines } = wrapText(text, y, {
    family: fontFamily,
    weight: fontWeight,
    fontSize,
    lineHeight: 1.6,
    maxWidth,
    align,
    maxLines
  })

  return {
    kind: 'text',
    x,
    y,
    w: maxWidth,
    lines,
    fontFamily,
    fontWeight,
    fontSize,
    color: color ?? tokens.colors.text,
    lineHeight: 1.6,
    role: 'body'
  }
}

// ─── Bullet item ──────────────────────────────────────────────────────────────

export interface BulletResult {
  nodes: SceneNode[]
  height: number
}

export function makeBulletItem(
  item: string | { text: string; title?: string; body?: string },
  x: number,
  y: number,
  maxWidth: number,
  tokens: ThemeTokens,
  depth = 0,
  opts?: { fontSize?: number; lineHeight?: number; indent?: number; bulletR?: number }
): BulletResult {
  const indent = opts?.indent ?? (depth === 0 ? 20 : 36)
  const bulletR = opts?.bulletR ?? (depth === 0 ? 3 : 2)
  const fontSize = opts?.fontSize ?? (depth === 0 ? tokens.type.body : tokens.type.sm)
  const fontFamily = tokens.fonts.body.family
  const fontWeight = tokens.fonts.body.weight
  const lh = opts?.lineHeight ?? 1.45

  const fullText = typeof item === 'string' ? item : item.text
  let titlePrefix = typeof item === 'object' && item.title ? item.title : ''
  let separator = ' — '

  if (!titlePrefix) {
    const match = /^([A-Za-z0-9\s/&,.-]{2,35})\s*([—–:])\s+(.+)$/.exec(fullText)
    if (match) {
      titlePrefix = match[1].trim()
      separator = ` ${match[2]} `
    }
  }

  const textX = x + indent + bulletR * 2 + 6
  const textMaxW = Math.max(50, maxWidth - (textX - x))

  const { lines, totalHeight } = wrapText(fullText, y, {
    family: fontFamily,
    weight: fontWeight,
    fontSize,
    lineHeight: lh,
    maxWidth: textMaxW
  })

  // Format runs if title prefix exists
  if (titlePrefix && lines.length > 0) {
    const prefixStr = `${titlePrefix}${separator}`
    const firstLineText = lines[0].text

    if (firstLineText.startsWith(titlePrefix)) {
      const splitIdx = firstLineText.indexOf(separator)
      const actualPrefix = splitIdx !== -1 ? firstLineText.slice(0, splitIdx + separator.length) : prefixStr
      const remainder = firstLineText.slice(actualPrefix.length)

      lines[0].runs = [
        {
          text: actualPrefix,
          bold: true,
          fontFamily: tokens.fonts.bodySemiBold.family,
          color: tokens.colors.heading
        },
        {
          text: remainder,
          bold: false,
          fontFamily: tokens.fonts.body.family,
          color: depth === 0 ? tokens.colors.text : tokens.colors.muted
        }
      ]

      for (let i = 1; i < lines.length; i++) {
        lines[i].runs = [
          {
            text: lines[i].text,
            bold: false,
            fontFamily: tokens.fonts.body.family,
            color: depth === 0 ? tokens.colors.text : tokens.colors.muted
          }
        ]
      }
    }
  }

  // Bullet Y = midpoint of first line
  const lineH = fontSize * lh
  const bulletY = y + lineH / 2

  const bulletNode: CircleNode = {
    kind: 'circle',
    cx: x + indent,
    cy: bulletY,
    r: bulletR,
    fill: tokens.colors.accent
  }

  const textNode: TextNode = {
    kind: 'text',
    x: textX,
    y,
    w: textMaxW,
    lines,
    fontFamily,
    fontWeight,
    fontSize,
    color: depth === 0 ? tokens.colors.text : tokens.colors.muted,
    lineHeight: lh,
    role: 'body'
  }

  return {
    nodes: [bulletNode, textNode],
    height: totalHeight + (depth === 0 ? 8 : 4)
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface CardResult {
  nodes: SceneNode[]
  height: number
}

export function makeCard(
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string | undefined,
  tokens: ThemeTokens
): CardResult {
  const nodes: SceneNode[] = []
  const r = tokens.radius.r3
  const padding = 16

  // Measure title
  const titleW = Math.max(50, w - padding * 2)
  const titleNode = makeBodyNode(title, x + padding, y + padding + 4, titleW, tokens, { bold: true })
  const titleH = titleNode.lines.length * Math.ceil(tokens.type.body * 1.35)

  // Measure body
  let bodyH = 0
  let bodyNode: TextNode | undefined
  if (body) {
    bodyNode = makeBodyNode(body, x + padding, y + padding + 4 + titleH + 8, titleW, tokens, {
      size: 'sm',
      color: tokens.colors.muted
    })
    bodyH = bodyNode.lines.length * Math.ceil(tokens.type.sm * 1.45)
  }

  const contentH = padding + 4 + titleH + (body ? 8 + bodyH : 0) + padding
  const actualH = Math.max(h, contentH)

  // Shadow layers (stacked rects behind card)
  tokens.shadow.soft.forEach(({ offsetY, expand, opacity }) => {
    nodes.push({
      kind: 'rect',
      x: x - expand,
      y: y + offsetY,
      w: w + expand * 2,
      h: actualH + expand,
      radius: r,
      fill: '#000000',
      fillOpacity: opacity
    })
  })

  // Card surface
  const surfaceFill = parseSurface(tokens.colors.surface)
  nodes.push({
    kind: 'rect',
    x,
    y,
    w,
    h: actualH,
    radius: r,
    fill: surfaceFill.color,
    fillOpacity: surfaceFill.opacity,
    stroke: { color: tokens.colors.border, width: 0.75 }
  })

  // Accent top line
  nodes.push({
    kind: 'rect',
    x: x + r,
    y,
    w: w - r * 2,
    h: 2,
    fill: tokens.colors.accent
  })

  nodes.push(titleNode)
  if (bodyNode) {
    nodes.push(bodyNode)
  }

  return { nodes, height: actualH }
}

function parseSurface(surface: string): { color: string; opacity: number } {
  const rgbaMatch = surface.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch
    return {
      color: `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`,
      opacity: parseFloat(a)
    }
  }
  return { color: surface, opacity: 1 }
}

// ─── Page number ──────────────────────────────────────────────────────────────

export function makePageNumber(
  n: number,
  total: number,
  page: PageDims,
  tokens: ThemeTokens
): PageNumberNode {
  return {
    kind: 'pageNumber',
    n,
    total,
    x: page.width - page.marginX - 48,
    y: page.height - page.footerHeight + 10,
    w: 48,
    fontFamily: tokens.fonts.body.family,
    fontSize: tokens.type.sm,
    color: tokens.colors.muted,
    align: 'right'
  }
}

// ─── Stat block ───────────────────────────────────────────────────────────────

export interface StatResult {
  nodes: SceneNode[]
  height: number
}

export function makeStatItem(
  value: string,
  label: string,
  delta: string | undefined,
  deltaPositive: boolean | undefined,
  x: number,
  y: number,
  w: number,
  tokens: ThemeTokens
): StatResult {
  const nodes: SceneNode[] = []

  // Big value number
  const valueFontSize = Math.min(72, tokens.type.h1 * 1.3)
  const valueFont = tokens.fonts.headingBold
  const { lines: valueLines, totalHeight: valueH } = wrapText(value, y, {
    family: valueFont.family,
    weight: valueFont.weight,
    fontSize: valueFontSize,
    lineHeight: 1.1,
    maxWidth: w,
    maxLines: 1,
    align: 'center'
  })

  nodes.push({
    kind: 'text',
    x, y, w,
    lines: valueLines,
    fontFamily: valueFont.family,
    fontWeight: valueFont.weight,
    fontSize: valueFontSize,
    color: tokens.colors.accent,
    lineHeight: 1.1,
    role: 'heading'
  })

  let curY = y + valueH + 8

  // Label
  const { lines: labelLines, totalHeight: labelH } = wrapText(label, curY, {
    family: tokens.fonts.body.family,
    weight: tokens.fonts.body.weight,
    fontSize: tokens.type.sm,
    lineHeight: 1.4,
    maxWidth: w,
    align: 'center'
  })

  nodes.push({
    kind: 'text',
    x, y: curY, w,
    lines: labelLines,
    fontFamily: tokens.fonts.body.family,
    fontWeight: tokens.fonts.body.weight,
    fontSize: tokens.type.sm,
    color: tokens.colors.muted,
    lineHeight: 1.4,
    role: 'caption'
  })

  curY += labelH + 8

  // Delta chip
  if (delta) {
    const chipColor = deltaPositive ? '#10B981' : '#EF4444'
    const chipBg = deltaPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
    const { lines: dLines } = wrapText(delta, curY + 6, {
      family: tokens.fonts.body.family,
      weight: tokens.fonts.bodySemiBold.weight,
      fontSize: tokens.type.sm,
      lineHeight: 1.2,
      maxWidth: w,
      align: 'center'
    })
    nodes.push({
      kind: 'rect',
      x: x + w / 4, y: curY,
      w: w / 2, h: 24,
      radius: tokens.radius.r1,
      fill: chipBg
    })
    nodes.push({
      kind: 'text',
      x: x + w / 4, y: curY,
      w: w / 2,
      lines: dLines,
      fontFamily: tokens.fonts.body.family,
      fontWeight: tokens.fonts.bodySemiBold.weight,
      fontSize: tokens.type.sm,
      color: chipColor,
      lineHeight: 1.2,
      role: 'caption'
    })
    curY += 28
  }

  return { nodes, height: curY - y }
}

// ─── Divider line ─────────────────────────────────────────────────────────────

export function makeDivider(
  x: number,
  y: number,
  width: number,
  tokens: ThemeTokens
): LineNode {
  return {
    kind: 'line',
    x1: x, y1: y, x2: x + width, y2: y,
    color: tokens.colors.border,
    width: 0.75,
    opacity: 0.6
  }
}
