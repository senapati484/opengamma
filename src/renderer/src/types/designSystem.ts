/**
 * Design System Type Definitions
 * Based on the 72+ DESIGN.md systems from awesome-design-md-jp
 * https://github.com/kzhrknt/awesome-design-md-jp
 *
 * Each system has 9 standardized sections:
 * 1. Visual Theme & Atmosphere
 * 2. Color Palette & Roles
 * 3. Typography Rules
 * 4. Component Stylings
 * 5. Layout Principles
 * 6. Depth & Elevation
 * 7. Do's and Don'ts
 * 8. Responsive Behavior
 * 9. Agent Prompt Guide
 */

export interface ColorPalette {
  primary?: string
  secondary?: string
  accent?: string
  danger?: string
  warning?: string
  success?: string
  text?: string
  textSecondary?: string
  background?: string
  surface?: string
  border?: string
  [key: string]: string | undefined
}

export interface Typography {
  fontFamily: string
  fontSize?: {
    h1?: string
    h2?: string
    h3?: string
    body?: string
    caption?: string
  }
  fontWeight?: {
    light?: number
    regular?: number
    semibold?: number
    bold?: number
  }
  lineHeight?: {
    heading?: number
    body?: number
  }
  letterSpacing?: string
}

export interface SpacingScale {
  xs?: string
  s?: string
  m?: string
  l?: string
  xl?: string
  xxl?: string
  [key: string]: string | undefined
}

export interface ComponentStyle {
  borderRadius?: string
  shadow?: string
  padding?: string
  fontSize?: string
  fontWeight?: number | string
}

export interface DesignSystemMetadata {
  id: string
  slug: string
  name: string
  category: 'tech' | 'ecommerce' | 'travel' | 'cosmetics' | 'lifestyle' | 'airline' | 'media' | 'other'
  description: string
  brandColor: string
  textColor: string
  backgroundColor: string
  createdYear: number
  sourceUrl: string
  brandUrl?: string
}

export interface DesignSystem extends DesignSystemMetadata {
  // Section 1: Visual Theme
  philosophy?: string
  density?: string
  keywords?: string[]

  // Section 2: Color Palette
  colors: ColorPalette

  // Section 3: Typography
  typography: Typography

  // Section 5: Spacing
  spacing: SpacingScale

  // Section 6: Depth & Elevation
  shadows?: {
    level0?: string
    level1?: string
    level2?: string
    level3?: string
  }

  // Section 7: Constraints
  dosList?: string[]
  dontsList?: string[]

  // Section 8: Responsive
  breakpoints?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }

  // Section 9: Agent Prompt
  quickReference?: string
}

/**
 * Curated list of 15 popular design systems included in opengamma
 * These are high-quality, well-documented examples from awesome-design-md-jp
 */
export const CURATED_DESIGN_SYSTEMS: DesignSystemMetadata[] = [
  {
    id: 'pola',
    slug: 'pola',
    name: 'POLA',
    category: 'cosmetics',
    description: 'Premium cosmetics brand with minimalist, monochrome aesthetic',
    brandColor: '#000000',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/pola',
    brandUrl: 'https://www.pola.co.jp/'
  },
  {
    id: 'ana',
    slug: 'ana',
    name: 'ANA (全日本空輸)',
    category: 'airline',
    description: 'Airline brand with trust-oriented pill CTAs and high information density',
    brandColor: '#073190',
    textColor: '#333333',
    backgroundColor: '#f1f1f1',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/ana',
    brandUrl: 'https://www.ana.co.jp/'
  },
  {
    id: 'zenn',
    slug: 'zenn',
    name: 'Zenn',
    category: 'tech',
    description: 'Technical publishing platform with clean, readable typography (1.8 line-height)',
    brandColor: '#3ea8ff',
    textColor: 'rgba(0,0,0,0.82)',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/zenn',
    brandUrl: 'https://zenn.dev/'
  },
  {
    id: 'qiita',
    slug: 'qiita',
    name: 'Qiita',
    category: 'tech',
    description: 'Developer community platform with code-focused typography (YakuHanJPs)',
    brandColor: '#55c500',
    textColor: 'rgba(0,0,0,0.87)',
    backgroundColor: '#f5f6f6',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/qiita',
    brandUrl: 'https://qiita.com/'
  },
  {
    id: 'nitori',
    slug: 'nitori',
    name: 'ニトリ (Nitori)',
    category: 'ecommerce',
    description: 'Home furnishings retailer with warm, accessible palette',
    brandColor: '#ff6b35',
    textColor: '#333333',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/nitori',
    brandUrl: 'https://www.nitori.net/'
  },
  {
    id: 'ikyu',
    slug: 'ikyu',
    name: 'いくつ (ikyu)',
    category: 'travel',
    description: 'Travel booking platform with flexible multi-brand color layers',
    brandColor: '#1e88e5',
    textColor: '#333333',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/ikyu',
    brandUrl: 'https://www.ikyu.com/'
  },
  {
    id: 'jal',
    slug: 'jal',
    name: 'JAL (日本航空)',
    category: 'airline',
    description: 'Airline brand with global, corporate aesthetic (0.02em letter-spacing)',
    brandColor: '#003478',
    textColor: '#333333',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/jal',
    brandUrl: 'https://www.jal.co.jp/'
  },
  {
    id: 'mercari',
    slug: 'mercari',
    name: 'メルカリ (Mercari)',
    category: 'ecommerce',
    description: 'C2C marketplace with vibrant, accessible design',
    brandColor: '#ea352d',
    textColor: '#222222',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/mercari',
    brandUrl: 'https://mercari.com/'
  },
  {
    id: 'note',
    slug: 'note',
    name: 'note',
    category: 'media',
    description: 'Content publishing platform with editorial aesthetic',
    brandColor: '#0066ff',
    textColor: '#222222',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/note',
    brandUrl: 'https://note.com/'
  },
  {
    id: 'pixiv',
    slug: 'pixiv',
    name: 'pixiv',
    category: 'media',
    description: 'Art community platform with dark, immersive design',
    brandColor: '#0096fa',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/pixiv',
    brandUrl: 'https://www.pixiv.net/'
  },
  {
    id: 'chatwork',
    slug: 'chatwork',
    name: 'ChatWork',
    category: 'tech',
    description: 'Business messaging platform with clean, functional UI',
    brandColor: '#19a835',
    textColor: '#333333',
    backgroundColor: '#f5f5f5',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/chatwork',
    brandUrl: 'https://go.chatwork.com/'
  },
  {
    id: 'github',
    slug: 'github',
    name: 'GitHub',
    category: 'tech',
    description: 'Developer platform with accessible, neutral palette (primer)',
    brandColor: '#238636',
    textColor: '#24292f',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/github',
    brandUrl: 'https://github.com/'
  },
  {
    id: 'figma',
    slug: 'figma',
    name: 'Figma',
    category: 'tech',
    description: 'Design platform with warm, playful color system',
    brandColor: '#f24e1e',
    textColor: '#25282d',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/figma',
    brandUrl: 'https://figma.com/'
  },
  {
    id: 'slack',
    slug: 'slack',
    name: 'Slack',
    category: 'tech',
    description: 'Team collaboration platform with vibrant multi-color system',
    brandColor: '#611f69',
    textColor: '#2c2d30',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/slack',
    brandUrl: 'https://slack.com/'
  },
  {
    id: 'stripe',
    slug: 'stripe',
    name: 'Stripe',
    category: 'tech',
    description: 'Payment platform with minimalist, corporate aesthetic',
    brandColor: '#625b56',
    textColor: '#32325d',
    backgroundColor: '#ffffff',
    createdYear: 2026,
    sourceUrl: 'https://github.com/kzhrknt/awesome-design-md-jp/tree/main/design-md/stripe',
    brandUrl: 'https://stripe.com/'
  }
]

/**
 * Helper function to fetch a full design system from GitHub
 * Given a slug like 'pola', fetches the DESIGN.md and parses it
 */
export async function fetchDesignSystemFromGitHub(
  slug: string
): Promise<DesignSystem | null> {
  const baseUrl = 'https://raw.githubusercontent.com/kzhrknt/awesome-design-md-jp/main/design-md'
  const designMdUrl = `${baseUrl}/${slug}/DESIGN.md`

  try {
    const response = await fetch(designMdUrl)
    if (!response.ok) return null

    const markdown = await response.text()
    // TODO: Parse markdown into DesignSystem object
    // For now, return null (Phase 2.2 will implement full parser)
    console.log(`[DesignSystem] Fetched ${slug} DESIGN.md (${markdown.length} chars)`)
    return null
  } catch (err) {
    console.error(`[DesignSystem] Failed to fetch ${slug}:`, err)
    return null
  }
}
