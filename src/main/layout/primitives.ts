/**
 * OpenGamma — Scene Graph Primitives
 *
 * Every visual element on a slide is represented as a typed SceneNode.
 * The layout engine produces an array of SceneNodes.
 * The PDF backend draws them via PDFKit.
 * The PPTX backend maps them to pptxgenjs primitives.
 *
 * RULE: No raw HTML. No CSS. No strings with embedded styles.
 * Everything is typed, measurable, and deterministically renderable.
 */

// ─── Gradient types ───────────────────────────────────────────────────────────

export interface LinearGradientFill {
  kind: 'linearGradient'
  x1: number; y1: number  // start point (absolute coords)
  x2: number; y2: number  // end point (absolute coords)
  stops: Array<{ position: number; color: string; opacity?: number }>
}

export interface RadialGradientFill {
  kind: 'radialGradient'
  cx: number; cy: number  // center (absolute)
  radius: number
  stops: Array<{ position: number; color: string; opacity?: number }>
}

export type FillValue = string | LinearGradientFill | RadialGradientFill

// ─── Scene node types ─────────────────────────────────────────────────────────

/** A filled/stroked rectangle, optionally rounded. */
export interface RectNode {
  kind: 'rect'
  x: number; y: number; w: number; h: number
  radius?: number
  fill?: FillValue
  fillOpacity?: number
  stroke?: { color: string; width: number; dashArray?: number[] }
  clip?: boolean  // Clip subsequent nodes to this rect bounds
}

export interface TextRun {
  text: string
  bold?: boolean
  fontFamily?: string
  color?: string
}

/** A wrapped text block with pre-computed line layout. */
export interface WrappedLine {
  text: string
  /** X offset from the node's x (for center/right alignment and hanging indent) */
  xOffset: number
  y: number
  /** Optional styled text runs within this line (e.g. bold title prefix + normal body) */
  runs?: TextRun[]
}

export interface TextNode {
  kind: 'text'
  x: number; y: number; w: number
  lines: WrappedLine[]
  fontFamily: string
  fontWeight: import('../model/themes').FontWeight
  fontSize: number
  color: string
  lineHeight: number  // multiplier (e.g. 1.4)
  opacity?: number
  tracking?: number   // letter spacing in pt
  /** Used for PDF accessibility tagging */
  role?: 'heading' | 'body' | 'caption' | 'code'
}

/** A rasterized image placed within a bounding box. */
export interface ImageNode {
  kind: 'image'
  x: number; y: number; w: number; h: number
  src: string
  alt: string
  fit: 'cover' | 'contain'
  radius?: number
  /** Dark overlay gradient drawn after the image */
  scrim?: { direction: 'bottom' | 'left' | 'right'; intensity: number }
}

/** A circle (bullet point, icon background, etc.). */
export interface CircleNode {
  kind: 'circle'
  cx: number; cy: number; r: number
  fill?: FillValue
  stroke?: { color: string; width: number }
  fillOpacity?: number
}

/** A straight line segment. */
export interface LineNode {
  kind: 'line'
  x1: number; y1: number; x2: number; y2: number
  color: string
  width: number
  dashArray?: number[]
  opacity?: number
}

/** Full-page background — drawn first, behind all other nodes. */
export interface BackgroundNode {
  kind: 'background'
  fill: FillValue
  /** Optional radial glow drawn on top (title slides) */
  glow?: {
    cx: number; cy: number; radius: number
    color: string; opacity: number
  }
}

/**
 * A clip group — all children are clipped to the given rect.
 * Used for rounded image containers, card overflow, etc.
 */
export interface ClipGroupNode {
  kind: 'clipGroup'
  x: number; y: number; w: number; h: number
  radius?: number
  children: SceneNode[]
}

/** Slide page number — drawn in the footer zone. */
export interface PageNumberNode {
  kind: 'pageNumber'
  n: number
  total: number
  x: number; y: number; w: number
  fontFamily: string
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
}

/** PDF hyperlink annotation (no visual) */
export interface LinkNode {
  kind: 'link'
  x: number; y: number; w: number; h: number
  url: string
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type SceneNode =
  | BackgroundNode
  | RectNode
  | TextNode
  | ImageNode
  | CircleNode
  | LineNode
  | ClipGroupNode
  | PageNumberNode
  | LinkNode

/** A complete rendered slide ready for the PDF/PPTX backend. */
export interface RenderedSlide {
  nodes: SceneNode[]
  width: number
  height: number
}
