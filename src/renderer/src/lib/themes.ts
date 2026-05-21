import type { Theme } from '../types'

/**
 * An extended interface of Theme that exposes the optional fontImport property
 * for context loader styling injected before Claude generations.
 */
export interface AppTheme extends Theme {
  fontImport: string
}

/**
 * The default collection of 15 premium slide themes supported by the renderer.
 * Each theme features a curated, harmonized color palette, customized Google Font combinations,
 * and comprehensive Reveal.js custom CSS token bindings.
 */
export const themes: AppTheme[] = [
  {
    id: 'startup-gradient',
    name: 'Startup Gradient',
    description: 'Vibrant purple-violet gradient with modern Syne typography. Full pitch energy.',
    colors: {
      primary: '#8B5CF6',
      accent: '#EC4899',
      bg: '#1E1B4B',
      text: '#F3F4F6'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #111827;
  --background-gradient: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #111827 100%);
  --r-main-font: 'Plus Jakarta Sans', sans-serif;
  --r-heading-font: 'Syne', sans-serif;
  --r-main-color: #f3f4f6;
  --r-heading-color: #ffffff;
  --r-link-color: #ec4899;
  --r-heading1-size: 3.2em;
  --r-heading2-size: 2.2em;
}
.reveal {
  background: var(--background-gradient) !important;
}
.reveal section h1, .reveal section h2 {
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 30%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}`
  },
  {
    id: 'academic-clean',
    name: 'Academic Clean',
    description: 'Prestigious white paper aesthetic with editorial serif typography.',
    colors: {
      primary: '#111827',
      accent: '#0F766E',
      bg: '#FFFFFF',
      text: '#1F2937'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Lora:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #ffffff;
  --r-main-font: 'Lora', serif;
  --r-heading-font: 'Playfair Display', serif;
  --r-main-color: #1f2937;
  --r-heading-color: #111827;
  --r-link-color: #0f766e;
  --r-heading1-size: 2.8em;
  --r-heading2-size: 2.0em;
}
.reveal section {
  text-align: left;
}
.reveal section h1, .reveal section h2 {
  font-style: italic;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.3em;
}`
  },
  {
    id: 'a11y-dark',
    name: 'Accessible Dark',
    description: 'High-contrast black and yellow. Maximized for readability and accessibility.',
    colors: {
      primary: '#FACC15',
      accent: '#FACC15',
      bg: '#000000',
      text: '#FFFFFF'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #000000;
  --r-main-font: 'Atkinson Hyperlegible', sans-serif;
  --r-heading-font: 'Atkinson Hyperlegible', sans-serif;
  --r-main-color: #ffffff;
  --r-heading-color: #facc15;
  --r-link-color: #facc15;
  --r-heading1-size: 3.5em;
  --r-heading2-size: 2.4em;
}
.reveal section strong {
  color: #facc15;
  text-decoration: underline;
  text-underline-offset: 4px;
}`
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    description: 'Cybersecurity console style, featuring glowing green on pure dark.',
    colors: {
      primary: '#10B981',
      accent: '#34D399',
      bg: '#030712',
      text: '#E0E7FF'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #030712;
  --r-main-font: 'JetBrains Mono', monospace;
  --r-heading-font: 'JetBrains Mono', monospace;
  --r-main-color: #e0e7ff;
  --r-heading-color: #10b981;
  --r-link-color: #34d399;
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}
.reveal pre {
  border: 1px solid #10b981 !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}`
  },
  {
    id: 'corporate-minimal',
    name: 'Corporate Minimal',
    description: 'Clean consulting layout, utilizing card styling, clean lines, and Inter.',
    colors: {
      primary: '#1F2937',
      accent: '#2563EB',
      bg: '#F8FAFC',
      text: '#334155'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #f8fafc;
  --r-main-font: 'Inter', sans-serif;
  --r-heading-font: 'Inter', sans-serif;
  --r-main-color: #334155;
  --r-heading-color: #1f2937;
  --r-link-color: #2563eb;
}
.reveal section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2.5em !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
}`
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description:
      'Gradient dark-blue backdrop, designed for data analytics and finance presentations.',
    colors: {
      primary: '#0284C7',
      accent: '#38BDF8',
      bg: '#0F172A',
      text: '#F1F5F9'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&family=Plus+Jakarta+Sans:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #0f172a;
  --background-gradient: linear-gradient(180deg, #0a0f1d 0%, #0369a1 100%);
  --r-main-font: 'Plus Jakarta Sans', sans-serif;
  --r-heading-font: 'Outfit', sans-serif;
  --r-main-color: #f1f5f9;
  --r-heading-color: #ffffff;
  --r-link-color: #38bdf8;
}
.reveal {
  background: var(--background-gradient) !important;
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
}`
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm charcoal background with eye-catching energetic orange accents.',
    colors: {
      primary: '#EA580C',
      accent: '#F97316',
      bg: '#1C1917',
      text: '#FAFAF9'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&display=swap');",
    cssTokens: `:root {
  --r-background-color: #1c1917;
  --r-main-font: 'Sora', sans-serif;
  --r-heading-font: 'Sora', sans-serif;
  --r-main-color: #fafaf9;
  --r-heading-color: #ea580c;
  --r-link-color: #f97316;
  --r-heading1-size: 3.0em;
}
.reveal section h1, .reveal section h2 {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #f97316;
}`
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper',
    description: 'Relaxed cream textured backdrop. Ideal for editorials and deep dive journalism.',
    colors: {
      primary: '#451A03',
      accent: '#B45309',
      bg: '#FDFBF7',
      text: '#292524'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=EB+Garamond:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #fdfbf7;
  --r-main-font: 'EB Garamond', serif;
  --r-heading-font: 'Cinzel', serif;
  --r-main-color: #292524;
  --r-heading-color: #451a03;
  --r-link-color: #b45309;
}
.reveal section {
  padding: 3em !important;
  background: #faf7f2;
  border: 1px dashed #d6d3d1;
}`
  },
  {
    id: 'forest-dark',
    name: 'Forest Dark',
    description: 'Deep forest green backdrop coupled with sustainability and earth tones.',
    colors: {
      primary: '#064E3B',
      accent: '#10B981',
      bg: '#022C22',
      text: '#ECFDF5'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;1,400&family=Montserrat:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #022c22;
  --r-main-font: 'Montserrat', sans-serif;
  --r-heading-font: 'Fraunces', serif;
  --r-main-color: #ecfdf5;
  --r-heading-color: #10b981;
  --r-link-color: #34d399;
}
.reveal section h1, .reveal section h2 {
  font-style: italic;
  font-weight: 700;
  color: #ecfdf5;
}`
  },
  {
    id: 'pastel-soft',
    name: 'Pastel Soft',
    description:
      'Calming pink and lavender cards. Friendly styling built for wellness and education.',
    colors: {
      primary: '#DB2777',
      accent: '#EC4899',
      bg: '#FFF5F5',
      text: '#4A5568'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Quicksand:wght@500;700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #fff5f5;
  --r-main-font: 'Quicksand', sans-serif;
  --r-heading-font: 'Fredoka', sans-serif;
  --r-main-color: #4a5568;
  --r-heading-color: #db2777;
  --r-link-color: #ec4899;
}
.reveal section {
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(219, 39, 119, 0.06);
  padding: 2.5em !important;
}`
  },
  {
    id: 'noir-gold',
    name: 'Noir Gold',
    description: 'Ultra luxury golden borders surrounding an intense absolute black space.',
    colors: {
      primary: '#D97706',
      accent: '#F59E0B',
      bg: '#000000',
      text: '#E5E7EB'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,700;1,400&family=Montserrat:wght@300;400&display=swap');",
    cssTokens: `:root {
  --r-background-color: #000000;
  --r-main-font: 'Montserrat', sans-serif;
  --r-heading-font: 'Bodoni Moda', serif;
  --r-main-color: #e5e7eb;
  --r-heading-color: #f59e0b;
  --r-link-color: #d97706;
}
.reveal section h1, .reveal section h2 {
  border-top: 1px solid #f59e0b;
  border-bottom: 1px solid #f59e0b;
  padding: 0.4em 0;
  letter-spacing: 0.08em;
}`
  },
  {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    description: 'Immersive deep violet and purple gradients curated for creative agencies.',
    colors: {
      primary: '#6D28D9',
      accent: '#A78BFA',
      bg: '#0F0A1E',
      text: '#F5F3FF'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=DM+Sans:wght@400;500&display=swap');",
    cssTokens: `:root {
  --r-background-color: #0f0a1e;
  --background-gradient: linear-gradient(135deg, #0f0a1e 0%, #1e1138 100%);
  --r-main-font: 'DM Sans', sans-serif;
  --r-heading-font: 'Outfit', sans-serif;
  --r-main-color: #f5f3ff;
  --r-heading-color: #a78bfa;
  --r-link-color: #c084fc;
}
.reveal {
  background: var(--background-gradient) !important;
}`
  },
  {
    id: 'grid-paper',
    name: 'Grid Paper',
    description:
      'Technical grid blueprint pattern. Crafted for design, engineering, and architecture.',
    colors: {
      primary: '#0F172A',
      accent: '#2563EB',
      bg: '#FFFFFF',
      text: '#334155'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #ffffff;
  --r-main-font: 'Space Grotesk', sans-serif;
  --r-heading-font: 'Space Grotesk', sans-serif;
  --r-main-color: #334155;
  --r-heading-color: #0f172a;
  --r-link-color: #2563eb;
}
.reveal {
  background-size: 30px 30px !important;
  background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px) !important;
}
.reveal section {
  background: #ffffff;
  border: 3px solid #0f172a;
  padding: 2.2em !important;
}`
  },
  {
    id: 'red-accent',
    name: 'Red Accent',
    description: 'Bold red side-accent lines. Highlights urgency, metrics, and high-impact sales.',
    colors: {
      primary: '#DC2626',
      accent: '#EF4444',
      bg: '#FFFFFF',
      text: '#1F2937'
    },
    revealTheme: 'white',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800&family=Inter:wght@400;600&display=swap');",
    cssTokens: `:root {
  --r-background-color: #ffffff;
  --r-main-font: 'Inter', sans-serif;
  --r-heading-font: 'Lexend', sans-serif;
  --r-main-color: #1f2937;
  --r-heading-color: #dc2626;
  --r-link-color: #ef4444;
}
.reveal section {
  border-left: 10px solid #dc2626;
  background: #fbfbfb;
  padding: 2.5em !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}`
  },
  {
    id: 'void-lime',
    name: 'Void Lime',
    description: 'Intense green glow against dark matter. Built for cyberpunk and gamers.',
    colors: {
      primary: '#84CC16',
      accent: '#A3E635',
      bg: '#030712',
      text: '#ECFDF5'
    },
    revealTheme: 'black',
    fontImport:
      "@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Syncopate:wght@700&display=swap');",
    cssTokens: `:root {
  --r-background-color: #030712;
  --r-main-font: 'Share Tech Mono', monospace;
  --r-heading-font: 'Syncopate', sans-serif;
  --r-main-color: #ecfdf5;
  --r-heading-color: #84cc16;
  --r-link-color: #a3e635;
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 0 12px rgba(132, 204, 22, 0.6);
}`
  }
]
