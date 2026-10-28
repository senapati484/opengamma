/**
 * OpenGamma — PDF Theme Tokens
 *
 * Extracts typed, PDF-renderable tokens from the existing renderer themes.
 * Avoids duplicating the 15 theme definitions — reads them from the source of truth.
 *
 * Fonts referenced here are the bundled local TTF files in resources/fonts/.
 * The PDF engine NEVER fetches from the web.
 */

import type { Gradient } from './schema'

// ─── Font registry ────────────────────────────────────────────────────────────

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold'
export type FontStyle = 'normal' | 'italic'

export interface FontRef {
  family: string
  weight: FontWeight
  style: FontStyle
}

export interface FontSet {
  heading: FontRef
  headingBold: FontRef
  body: FontRef
  bodySemiBold: FontRef
  mono: FontRef
}

// Map of font-family name → local TTF filename (in resources/fonts/)
// These must match exactly what is downloaded via the font download script.
export const FONT_FILE_MAP: Record<string, Record<FontWeight, string>> = {
  Syne: {
    regular: 'Syne-Regular.ttf',
    medium: 'Syne-Medium.ttf',
    semibold: 'Syne-SemiBold.ttf',
    bold: 'Syne-Bold.ttf',
    extrabold: 'Syne-ExtraBold.ttf'
  },
  'Plus Jakarta Sans': {
    regular: 'PlusJakartaSans-Regular.ttf',
    medium: 'PlusJakartaSans-Medium.ttf',
    semibold: 'PlusJakartaSans-SemiBold.ttf',
    bold: 'PlusJakartaSans-Bold.ttf',
    extrabold: 'PlusJakartaSans-ExtraBold.ttf'
  },
  'Playfair Display': {
    regular: 'PlayfairDisplay-Regular.ttf',
    medium: 'PlayfairDisplay-Regular.ttf',
    semibold: 'PlayfairDisplay-SemiBold.ttf',
    bold: 'PlayfairDisplay-Bold.ttf',
    extrabold: 'PlayfairDisplay-ExtraBold.ttf'
  },
  Lora: {
    regular: 'Lora-Regular.ttf',
    medium: 'Lora-Medium.ttf',
    semibold: 'Lora-SemiBold.ttf',
    bold: 'Lora-Bold.ttf',
    extrabold: 'Lora-Bold.ttf'
  },
  'Atkinson Hyperlegible': {
    regular: 'AtkinsonHyperlegible-Regular.ttf',
    medium: 'AtkinsonHyperlegible-Regular.ttf',
    semibold: 'AtkinsonHyperlegible-Bold.ttf',
    bold: 'AtkinsonHyperlegible-Bold.ttf',
    extrabold: 'AtkinsonHyperlegible-Bold.ttf'
  },
  'JetBrains Mono': {
    regular: 'JetBrainsMono-Regular.ttf',
    medium: 'JetBrainsMono-Medium.ttf',
    semibold: 'JetBrainsMono-SemiBold.ttf',
    bold: 'JetBrainsMono-Bold.ttf',
    extrabold: 'JetBrainsMono-ExtraBold.ttf'
  },
  Inter: {
    regular: 'Inter-Regular.ttf',
    medium: 'Inter-Medium.ttf',
    semibold: 'Inter-SemiBold.ttf',
    bold: 'Inter-Bold.ttf',
    extrabold: 'Inter-ExtraBold.ttf'
  },
  Outfit: {
    regular: 'Outfit-Regular.ttf',
    medium: 'Outfit-Medium.ttf',
    semibold: 'Outfit-SemiBold.ttf',
    bold: 'Outfit-Bold.ttf',
    extrabold: 'Outfit-ExtraBold.ttf'
  },
  Raleway: {
    regular: 'Raleway-Regular.ttf',
    medium: 'Raleway-Medium.ttf',
    semibold: 'Raleway-SemiBold.ttf',
    bold: 'Raleway-Bold.ttf',
    extrabold: 'Raleway-ExtraBold.ttf'
  },
  Montserrat: {
    regular: 'Montserrat-Regular.ttf',
    medium: 'Montserrat-Medium.ttf',
    semibold: 'Montserrat-SemiBold.ttf',
    bold: 'Montserrat-Bold.ttf',
    extrabold: 'Montserrat-ExtraBold.ttf'
  },
  Nunito: {
    regular: 'Nunito-Regular.ttf',
    medium: 'Nunito-Medium.ttf',
    semibold: 'Nunito-SemiBold.ttf',
    bold: 'Nunito-Bold.ttf',
    extrabold: 'Nunito-ExtraBold.ttf'
  },
  Poppins: {
    regular: 'Poppins-Regular.ttf',
    medium: 'Poppins-Medium.ttf',
    semibold: 'Poppins-SemiBold.ttf',
    bold: 'Poppins-Bold.ttf',
    extrabold: 'Poppins-ExtraBold.ttf'
  },
  'Cormorant Garamond': {
    regular: 'CormorantGaramond-Regular.ttf',
    medium: 'CormorantGaramond-Medium.ttf',
    semibold: 'CormorantGaramond-SemiBold.ttf',
    bold: 'CormorantGaramond-Bold.ttf',
    extrabold: 'CormorantGaramond-Bold.ttf'
  },
  'DM Sans': {
    regular: 'DMSans-Regular.ttf',
    medium: 'DMSans-Medium.ttf',
    semibold: 'DMSans-SemiBold.ttf',
    bold: 'DMSans-Bold.ttf',
    extrabold: 'DMSans-ExtraBold.ttf'
  },
  'Space Grotesk': {
    regular: 'SpaceGrotesk-Regular.ttf',
    medium: 'SpaceGrotesk-Medium.ttf',
    semibold: 'SpaceGrotesk-SemiBold.ttf',
    bold: 'SpaceGrotesk-Bold.ttf',
    extrabold: 'SpaceGrotesk-Bold.ttf'
  },
  'Space Mono': {
    regular: 'SpaceMono-Regular.ttf',
    medium: 'SpaceMono-Regular.ttf',
    semibold: 'SpaceMono-Bold.ttf',
    bold: 'SpaceMono-Bold.ttf',
    extrabold: 'SpaceMono-Bold.ttf'
  },
  'IBM Plex Mono': {
    regular: 'IBMPlexMono-Regular.ttf',
    medium: 'IBMPlexMono-Medium.ttf',
    semibold: 'IBMPlexMono-SemiBold.ttf',
    bold: 'IBMPlexMono-Bold.ttf',
    extrabold: 'IBMPlexMono-Bold.ttf'
  },
  // Fallback for any unknown font
  _fallback: {
    regular: 'Inter-Regular.ttf',
    medium: 'Inter-Medium.ttf',
    semibold: 'Inter-SemiBold.ttf',
    bold: 'Inter-Bold.ttf',
    extrabold: 'Inter-ExtraBold.ttf'
  }
}

// ─── Radius tokens ────────────────────────────────────────────────────────────

export interface RadiusTokens {
  r1: number // tiny  (tags, badges)
  r2: number // small (inputs)
  r3: number // medium (cards)
  r4: number // large (containers)
}

// ─── Shadow tokens ────────────────────────────────────────────────────────────

export interface ShadowLayer {
  offsetY: number
  expand: number
  opacity: number
}

export interface ShadowTokens {
  soft: ShadowLayer[]  // 4-layer stacked rect shadow
  glow: string | null  // CSS-style glow (accent-color based) — rendered as outer rect in PDF
}

// ─── Full theme token set ─────────────────────────────────────────────────────

export interface ThemeTokens {
  id: string
  colors: {
    bg: string
    bgGradient: Gradient | null
    text: string
    muted: string
    accent: string
    accentMuted: string  // accent at 15–20% opacity
    border: string
    surface: string      // card / panel background
    heading: string
    overlay: string      // scrim / overlay base
  }
  fonts: FontSet
  type: {
    h1: number           // px — display heading
    h2: number           // px — section heading
    h3: number           // px — card title
    body: number         // px — body text
    sm: number           // px — caption / label
    mono: number         // px — code
  }
  radius: RadiusTokens
  shadow: ShadowTokens
  /** Whether headings in this theme use gradient-clip text (white in PDF) */
  headingIsGradientClip: boolean
  /** Actual heading color for PDF (resolved from gradient if applicable) */
  headingColor: string
  /** Accent bar: whether to show the 48×4 bar above H1 on content slides */
  showAccentBar: boolean
}

// ─── Token definitions (one per theme ID) ────────────────────────────────────

const THEME_TOKENS: Record<string, ThemeTokens> = {
  'startup-gradient': {
    id: 'startup-gradient',
    colors: {
      bg: '#1E1B4B',
      bgGradient: {
        kind: 'linear',
        angle: 135,
        stops: [
          { position: 0, color: '#1e1b4b', opacity: 1 },
          { position: 0.5, color: '#311042', opacity: 1 },
          { position: 1, color: '#111827', opacity: 1 }
        ]
      },
      text: '#F3F4F6',
      muted: '#9CA3AF',
      accent: '#EC4899',
      accentMuted: 'rgba(236,72,153,0.15)',
      border: '#374151',
      surface: 'rgba(255,255,255,0.04)',
      heading: '#FFFFFF',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Syne', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Syne', weight: 'extrabold', style: 'normal' },
      body: { family: 'Plus Jakarta Sans', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Plus Jakarta Sans', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 56, h2: 40, h3: 22, body: 18, sm: 13, mono: 15 },
    radius: { r1: 4, r2: 8, r3: 14, r4: 20 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.1 },
        { offsetY: 6, expand: 2, opacity: 0.08 },
        { offsetY: 14, expand: 4, opacity: 0.05 },
        { offsetY: 24, expand: 8, opacity: 0.03 }
      ],
      glow: '#8B5CF6'
    },
    headingIsGradientClip: true,
    headingColor: '#FFFFFF',
    showAccentBar: true
  },

  'academic-clean': {
    id: 'academic-clean',
    colors: {
      bg: '#FFFFFF',
      bgGradient: null,
      text: '#1F2937',
      muted: '#6B7280',
      accent: '#0F766E',
      accentMuted: 'rgba(15,118,110,0.12)',
      border: '#E5E7EB',
      surface: '#F9FAFB',
      heading: '#111827',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      body: { family: 'Lora', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Lora', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 48, h2: 34, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 0, r2: 0, r3: 0, r4: 0 },
    shadow: {
      soft: [
        { offsetY: 1, expand: 0, opacity: 0.04 },
        { offsetY: 2, expand: 1, opacity: 0.03 },
        { offsetY: 4, expand: 2, opacity: 0.02 },
        { offsetY: 8, expand: 4, opacity: 0.01 }
      ],
      glow: null
    },
    headingIsGradientClip: false,
    headingColor: '#111827',
    showAccentBar: true
  },

  'a11y-dark': {
    id: 'a11y-dark',
    colors: {
      bg: '#000000',
      bgGradient: null,
      text: '#FFFFFF',
      muted: '#E5E7EB',
      accent: '#FACC15',
      accentMuted: 'rgba(250,204,21,0.15)',
      border: '#FACC15',
      surface: '#0A0A0A',
      heading: '#FACC15',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Atkinson Hyperlegible', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Atkinson Hyperlegible', weight: 'bold', style: 'normal' },
      body: { family: 'Atkinson Hyperlegible', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Atkinson Hyperlegible', weight: 'bold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 60, h2: 44, h3: 24, body: 22, sm: 16, mono: 16 },
    radius: { r1: 4, r2: 4, r3: 4, r4: 4 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.0 },
        { offsetY: 2, expand: 0, opacity: 0.0 },
        { offsetY: 2, expand: 0, opacity: 0.0 },
        { offsetY: 2, expand: 0, opacity: 0.0 }
      ],
      glow: null
    },
    headingIsGradientClip: false,
    headingColor: '#FACC15',
    showAccentBar: false
  },

  'terminal-green': {
    id: 'terminal-green',
    colors: {
      bg: '#030712',
      bgGradient: null,
      text: '#E0E7FF',
      muted: '#6B7280',
      accent: '#10B981',
      accentMuted: 'rgba(16,185,129,0.12)',
      border: '#10B981',
      surface: '#050B14',
      heading: '#10B981',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'JetBrains Mono', weight: 'bold', style: 'normal' },
      headingBold: { family: 'JetBrains Mono', weight: 'bold', style: 'normal' },
      body: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'JetBrains Mono', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 50, h2: 36, h3: 20, body: 16, sm: 12, mono: 14 },
    radius: { r1: 2, r2: 2, r3: 2, r4: 2 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.05 },
        { offsetY: 4, expand: 1, opacity: 0.04 },
        { offsetY: 8, expand: 2, opacity: 0.03 },
        { offsetY: 15, expand: 4, opacity: 0.02 }
      ],
      glow: '#10B981'
    },
    headingIsGradientClip: false,
    headingColor: '#10B981',
    showAccentBar: false
  },

  'corporate-minimal': {
    id: 'corporate-minimal',
    colors: {
      bg: '#F8FAFC',
      bgGradient: null,
      text: '#334155',
      muted: '#64748B',
      accent: '#2563EB',
      accentMuted: 'rgba(37,99,235,0.08)',
      border: '#E2E8F0',
      surface: '#FFFFFF',
      heading: '#1F2937',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Inter', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Inter', weight: 'extrabold', style: 'normal' },
      body: { family: 'Inter', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Inter', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 48, h2: 34, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 6, r2: 8, r3: 12, r4: 16 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.04 },
        { offsetY: 4, expand: 1, opacity: 0.03 },
        { offsetY: 8, expand: 2, opacity: 0.02 },
        { offsetY: 15, expand: 4, opacity: 0.015 }
      ],
      glow: null
    },
    headingIsGradientClip: false,
    headingColor: '#1F2937',
    showAccentBar: true
  },

  'deep-ocean': {
    id: 'deep-ocean',
    colors: {
      bg: '#0F172A',
      bgGradient: {
        kind: 'linear',
        angle: 180,
        stops: [
          { position: 0, color: '#0a0f1d', opacity: 1 },
          { position: 1, color: '#0369a1', opacity: 1 }
        ]
      },
      text: '#F1F5F9',
      muted: '#94A3B8',
      accent: '#38BDF8',
      accentMuted: 'rgba(56,189,248,0.12)',
      border: '#1E293B',
      surface: 'rgba(15,23,42,0.6)',
      heading: '#FFFFFF',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      headingBold: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      body: { family: 'Plus Jakarta Sans', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Plus Jakarta Sans', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 54, h2: 38, h3: 22, body: 18, sm: 13, mono: 15 },
    radius: { r1: 6, r2: 10, r3: 16, r4: 22 },
    shadow: {
      soft: [
        { offsetY: 3, expand: 0, opacity: 0.12 },
        { offsetY: 8, expand: 2, opacity: 0.09 },
        { offsetY: 16, expand: 4, opacity: 0.06 },
        { offsetY: 25, expand: 8, opacity: 0.04 }
      ],
      glow: '#0369A1'
    },
    headingIsGradientClip: false,
    headingColor: '#FFFFFF',
    showAccentBar: true
  },

  ember: {
    id: 'ember',
    colors: {
      bg: '#1C1917',
      bgGradient: null,
      text: '#FAFAF9',
      muted: '#A8A29E',
      accent: '#F97316',
      accentMuted: 'rgba(249,115,22,0.15)',
      border: '#292524',
      surface: 'rgba(28,25,22,0.7)',
      heading: '#EA580C',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      headingBold: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      body: { family: 'Plus Jakarta Sans', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Plus Jakarta Sans', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 52, h2: 36, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 4, r2: 6, r3: 8, r4: 12 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.08 },
        { offsetY: 6, expand: 2, opacity: 0.06 },
        { offsetY: 12, expand: 4, opacity: 0.04 },
        { offsetY: 20, expand: 8, opacity: 0.02 }
      ],
      glow: '#EA580C'
    },
    headingIsGradientClip: false,
    headingColor: '#EA580C',
    showAccentBar: true
  },

  'warm-paper': {
    id: 'warm-paper',
    colors: {
      bg: '#FDFBF7',
      bgGradient: null,
      text: '#292524',
      muted: '#78716C',
      accent: '#B45309',
      accentMuted: 'rgba(180,83,9,0.12)',
      border: '#D6D3D1',
      surface: '#FAF7F2',
      heading: '#451A03',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      body: { family: 'Lora', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Lora', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 50, h2: 34, h3: 20, body: 19, sm: 13, mono: 14 },
    radius: { r1: 0, r2: 2, r3: 4, r4: 6 },
    shadow: {
      soft: [
        { offsetY: 1, expand: 0, opacity: 0.03 },
        { offsetY: 2, expand: 1, opacity: 0.02 },
        { offsetY: 4, expand: 2, opacity: 0.01 },
        { offsetY: 8, expand: 4, opacity: 0.01 }
      ],
      glow: null
    },
    headingIsGradientClip: false,
    headingColor: '#451A03',
    showAccentBar: true
  },

  'forest-dark': {
    id: 'forest-dark',
    colors: {
      bg: '#022C22',
      bgGradient: null,
      text: '#ECFDF5',
      muted: '#A7F3D0',
      accent: '#10B981',
      accentMuted: 'rgba(16,185,129,0.15)',
      border: '#064E3B',
      surface: 'rgba(2,44,34,0.6)',
      heading: '#10B981',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Playfair Display', weight: 'bold', style: 'italic' },
      headingBold: { family: 'Playfair Display', weight: 'bold', style: 'italic' },
      body: { family: 'Montserrat', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Montserrat', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 52, h2: 36, h3: 22, body: 18, sm: 13, mono: 14 },
    radius: { r1: 4, r2: 6, r3: 10, r4: 16 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.08 },
        { offsetY: 6, expand: 2, opacity: 0.06 },
        { offsetY: 12, expand: 4, opacity: 0.04 },
        { offsetY: 20, expand: 8, opacity: 0.02 }
      ],
      glow: '#10B981'
    },
    headingIsGradientClip: false,
    headingColor: '#10B981',
    showAccentBar: true
  },

  'pastel-soft': {
    id: 'pastel-soft',
    colors: {
      bg: '#FFF5F5',
      bgGradient: null,
      text: '#4A5568',
      muted: '#718096',
      accent: '#DB2777',
      accentMuted: 'rgba(219,39,119,0.1)',
      border: '#FED7D7',
      surface: '#FFFFFF',
      heading: '#DB2777',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Plus Jakarta Sans', weight: 'extrabold', style: 'normal' },
      headingBold: { family: 'Plus Jakarta Sans', weight: 'extrabold', style: 'normal' },
      body: { family: 'Plus Jakarta Sans', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Plus Jakarta Sans', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 50, h2: 34, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 8, r2: 12, r3: 16, r4: 24 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.04 },
        { offsetY: 6, expand: 2, opacity: 0.03 },
        { offsetY: 12, expand: 4, opacity: 0.02 },
        { offsetY: 20, expand: 8, opacity: 0.015 }
      ],
      glow: '#DB2777'
    },
    headingIsGradientClip: false,
    headingColor: '#DB2777',
    showAccentBar: true
  },

  'noir-gold': {
    id: 'noir-gold',
    colors: {
      bg: '#000000',
      bgGradient: null,
      text: '#E5E7EB',
      muted: '#9CA3AF',
      accent: '#F59E0B',
      accentMuted: 'rgba(245,158,11,0.15)',
      border: '#F59E0B',
      surface: '#080808',
      heading: '#F59E0B',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Playfair Display', weight: 'bold', style: 'normal' },
      body: { family: 'Montserrat', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Montserrat', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 54, h2: 38, h3: 22, body: 18, sm: 13, mono: 14 },
    radius: { r1: 0, r2: 0, r3: 0, r4: 0 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.1 },
        { offsetY: 6, expand: 2, opacity: 0.08 },
        { offsetY: 12, expand: 4, opacity: 0.05 },
        { offsetY: 20, expand: 8, opacity: 0.03 }
      ],
      glow: '#F59E0B'
    },
    headingIsGradientClip: false,
    headingColor: '#F59E0B',
    showAccentBar: true
  },

  'midnight-violet': {
    id: 'midnight-violet',
    colors: {
      bg: '#0F0A1E',
      bgGradient: {
        kind: 'linear',
        angle: 135,
        stops: [
          { position: 0, color: '#0f0a1e', opacity: 1 },
          { position: 1, color: '#1e1138', opacity: 1 }
        ]
      },
      text: '#F5F3FF',
      muted: '#C084FC',
      accent: '#A78BFA',
      accentMuted: 'rgba(167,139,250,0.15)',
      border: '#2E1065',
      surface: 'rgba(15,10,30,0.6)',
      heading: '#A78BFA',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      headingBold: { family: 'Outfit', weight: 'extrabold', style: 'normal' },
      body: { family: 'DM Sans', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'DM Sans', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 56, h2: 40, h3: 22, body: 18, sm: 13, mono: 14 },
    radius: { r1: 6, r2: 8, r3: 12, r4: 18 },
    shadow: {
      soft: [
        { offsetY: 3, expand: 0, opacity: 0.12 },
        { offsetY: 8, expand: 2, opacity: 0.09 },
        { offsetY: 16, expand: 4, opacity: 0.06 },
        { offsetY: 25, expand: 8, opacity: 0.04 }
      ],
      glow: '#6D28D9'
    },
    headingIsGradientClip: false,
    headingColor: '#A78BFA',
    showAccentBar: true
  },

  'grid-paper': {
    id: 'grid-paper',
    colors: {
      bg: '#FFFFFF',
      bgGradient: null,
      text: '#334155',
      muted: '#64748B',
      accent: '#2563EB',
      accentMuted: 'rgba(37,99,235,0.12)',
      border: '#0F172A',
      surface: '#FFFFFF',
      heading: '#0F172A',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Space Grotesk', weight: 'bold', style: 'normal' },
      headingBold: { family: 'Space Grotesk', weight: 'bold', style: 'normal' },
      body: { family: 'Space Grotesk', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Space Grotesk', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 48, h2: 34, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 2, r2: 4, r3: 4, r4: 6 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.08 },
        { offsetY: 4, expand: 0, opacity: 0.06 },
        { offsetY: 6, expand: 0, opacity: 0.04 },
        { offsetY: 8, expand: 0, opacity: 0.02 }
      ],
      glow: null
    },
    headingIsGradientClip: false,
    headingColor: '#0F172A',
    showAccentBar: false
  },

  'red-accent': {
    id: 'red-accent',
    colors: {
      bg: '#FFFFFF',
      bgGradient: null,
      text: '#1F2937',
      muted: '#4B5563',
      accent: '#DC2626',
      accentMuted: 'rgba(220,38,38,0.12)',
      border: '#E5E7EB',
      surface: '#FBFBFB',
      heading: '#DC2626',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'Inter', weight: 'extrabold', style: 'normal' },
      headingBold: { family: 'Inter', weight: 'extrabold', style: 'normal' },
      body: { family: 'Inter', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'Inter', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 50, h2: 34, h3: 20, body: 18, sm: 13, mono: 14 },
    radius: { r1: 4, r2: 6, r3: 8, r4: 12 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.05 },
        { offsetY: 4, expand: 1, opacity: 0.04 },
        { offsetY: 8, expand: 2, opacity: 0.03 },
        { offsetY: 15, expand: 4, opacity: 0.02 }
      ],
      glow: '#DC2626'
    },
    headingIsGradientClip: false,
    headingColor: '#DC2626',
    showAccentBar: true
  },

  'void-lime': {
    id: 'void-lime',
    colors: {
      bg: '#030712',
      bgGradient: null,
      text: '#ECFDF5',
      muted: '#6EE7B7',
      accent: '#84CC16',
      accentMuted: 'rgba(132,204,22,0.15)',
      border: '#374151',
      surface: '#05080F',
      heading: '#84CC16',
      overlay: '#000000'
    },
    fonts: {
      heading: { family: 'JetBrains Mono', weight: 'bold', style: 'normal' },
      headingBold: { family: 'JetBrains Mono', weight: 'bold', style: 'normal' },
      body: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' },
      bodySemiBold: { family: 'JetBrains Mono', weight: 'semibold', style: 'normal' },
      mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
    },
    type: { h1: 52, h2: 36, h3: 20, body: 16, sm: 12, mono: 14 },
    radius: { r1: 0, r2: 0, r3: 0, r4: 0 },
    shadow: {
      soft: [
        { offsetY: 2, expand: 0, opacity: 0.1 },
        { offsetY: 6, expand: 2, opacity: 0.08 },
        { offsetY: 12, expand: 4, opacity: 0.05 },
        { offsetY: 20, expand: 8, opacity: 0.03 }
      ],
      glow: '#84CC16'
    },
    headingIsGradientClip: false,
    headingColor: '#84CC16',
    showAccentBar: false
  }
}

// ─── Default token (fallback for unknown/unmapped themes) ─────────────────────

const DEFAULT_TOKENS: ThemeTokens = {
  id: 'default',
  colors: {
    bg: '#1E293B',
    bgGradient: null,
    text: '#F1F5F9',
    muted: '#94A3B8',
    accent: '#6366F1',
    accentMuted: 'rgba(99,102,241,0.15)',
    border: '#334155',
    surface: 'rgba(255,255,255,0.05)',
    heading: '#FFFFFF',
    overlay: '#000000'
  },
  fonts: {
    heading: { family: 'Inter', weight: 'bold', style: 'normal' },
    headingBold: { family: 'Inter', weight: 'extrabold', style: 'normal' },
    body: { family: 'Inter', weight: 'regular', style: 'normal' },
    bodySemiBold: { family: 'Inter', weight: 'semibold', style: 'normal' },
    mono: { family: 'JetBrains Mono', weight: 'regular', style: 'normal' }
  },
  type: { h1: 52, h2: 36, h3: 20, body: 18, sm: 13, mono: 14 },
  radius: { r1: 6, r2: 8, r3: 14, r4: 20 },
  shadow: {
    soft: [
      { offsetY: 2, expand: 0, opacity: 0.08 },
      { offsetY: 6, expand: 2, opacity: 0.06 },
      { offsetY: 12, expand: 4, opacity: 0.04 },
      { offsetY: 20, expand: 8, opacity: 0.02 }
    ],
    glow: null
  },
  headingIsGradientClip: false,
  headingColor: '#FFFFFF',
  showAccentBar: true
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the PDF-renderable theme tokens for a given theme ID.
 * Falls back to default tokens if the theme ID is not mapped.
 */
export function getThemeTokens(themeId: string): ThemeTokens {
  return THEME_TOKENS[themeId] ?? buildFallbackTokens(themeId)
}

/**
 * For themes not yet in the static map, build a best-effort token set
 * from the renderer theme's colors object.
 */
function buildFallbackTokens(themeId: string): ThemeTokens {
  // Try to import the renderer themes lazily for color extraction
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { themes } = require('../../renderer/src/lib/themes') as { themes: Array<{ id: string; colors: Record<string, string> }> }
    const t = themes.find((x: { id: string }) => x.id === themeId)
    if (t) {
      const isDark = isColorDark(t.colors.bg ?? '#1E293B')
      return {
        ...DEFAULT_TOKENS,
        id: themeId,
        colors: {
          ...DEFAULT_TOKENS.colors,
          bg: t.colors.bg ?? DEFAULT_TOKENS.colors.bg,
          text: t.colors.text ?? DEFAULT_TOKENS.colors.text,
          accent: t.colors.accent ?? DEFAULT_TOKENS.colors.accent,
          accentMuted: hexToRgba(t.colors.accent ?? '#6366F1', 0.15),
          heading: isDark ? '#FFFFFF' : '#111827',
          surface: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'
        }
      }
    }
  } catch {
    // Running outside Electron renderer context — use default
  }
  return { ...DEFAULT_TOKENS, id: themeId }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance < 128
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function getFontFileName(family: string, weight: FontWeight): string {
  const familyMap = FONT_FILE_MAP[family] ?? FONT_FILE_MAP['_fallback']
  return familyMap[weight] ?? familyMap.regular
}
