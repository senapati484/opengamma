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
      secondary: '#6D28D9',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #111827 100%);
  --og-slide-text: #f3f4f6;
  --og-slide-muted: #9ca3af;
  --og-slide-accent: #ec4899;
  --og-slide-border: #374151;
  --og-slide-h1-size: 56px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Syne', sans-serif;
  --og-slide-font-body: 'Plus Jakarta Sans', sans-serif;
  --og-slide-radius: 12px;
  --og-slide-shadow: 0 10px 30px rgba(139, 92, 246, 0.2);
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
}
.reveal .card {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #f3f4f6 !important;
}
.reveal .stat-block {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
}
.reveal .badge {
  background: rgba(236, 72, 153, 0.1) !important;
  border: 1px solid rgba(236, 72, 153, 0.2) !important;
  color: #ec4899 !important;
}`
  },
  {
    id: 'academic-clean',
    name: 'Academic Clean',
    description: 'Prestigious white paper aesthetic with editorial serif typography.',
    colors: {
      primary: '#111827',
      secondary: '#374151',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #ffffff;
  --og-slide-text: #1f2937;
  --og-slide-muted: #6b7280;
  --og-slide-accent: #0f766e;
  --og-slide-border: #e5e7eb;
  --og-slide-h1-size: 48px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Playfair Display', serif;
  --og-slide-font-body: 'Lora', serif;
  --og-slide-radius: 0px;
  --og-slide-shadow: none;
}
.reveal section {
  text-align: left;
}
.reveal section h1, .reveal section h2 {
  font-style: italic;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.3em;
}
.reveal .card {
  background: #f9fafb !important;
  border: 1px solid #e5e7eb !important;
  color: #1f2937 !important;
  box-shadow: none !important;
  border-radius: 0px !important;
}
.reveal .stat-block {
  background: #f3f4f6 !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0px !important;
  box-shadow: none !important;
}
.reveal .badge {
  background: rgba(15, 118, 110, 0.1) !important;
  border: 1px solid rgba(15, 118, 110, 0.2) !important;
  color: #0f766e !important;
  border-radius: 0px !important;
}`
  },
  {
    id: 'a11y-dark',
    name: 'Accessible Dark',
    description: 'High-contrast black and yellow. Maximized for readability and accessibility.',
    colors: {
      primary: '#FACC15',
      secondary: '#EAB308',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #000000;
  --og-slide-text: #ffffff;
  --og-slide-muted: #e5e7eb;
  --og-slide-accent: #facc15;
  --og-slide-border: #facc15;
  --og-slide-h1-size: 60px;
  --og-slide-body-size: 22px;
  --og-slide-font-heading: 'Atkinson Hyperlegible', sans-serif;
  --og-slide-font-body: 'Atkinson Hyperlegible', sans-serif;
  --og-slide-radius: 4px;
  --og-slide-shadow: none;
}
.reveal section strong {
  color: #facc15;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.reveal .card {
  background: #000000 !important;
  border: 2px solid #facc15 !important;
  color: #ffffff !important;
  box-shadow: none !important;
  border-radius: 4px !important;
}
.reveal .stat-block {
  background: #000000 !important;
  border: 2px solid #facc15 !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}
.reveal .badge {
  background: rgba(250, 204, 21, 0.15) !important;
  border: 2px solid #facc15 !important;
  color: #facc15 !important;
  border-radius: 4px !important;
}`
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    description: 'Cybersecurity console style, featuring glowing green on pure dark.',
    colors: {
      primary: '#10B981',
      secondary: '#065F46',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #030712;
  --og-slide-text: #e0e7ff;
  --og-slide-muted: #6b7280;
  --og-slide-accent: #10b981;
  --og-slide-border: #10b981;
  --og-slide-h1-size: 50px;
  --og-slide-body-size: 16px;
  --og-slide-font-heading: 'JetBrains Mono', monospace;
  --og-slide-font-body: 'JetBrains Mono', monospace;
  --og-slide-radius: 2px;
  --og-slide-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}
.reveal pre {
  border: 1px solid #10b981 !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}
.reveal .card {
  background: #050b14 !important;
  border: 1px solid #10b981 !important;
  color: #e0e7ff !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.15) !important;
  border-radius: 2px !important;
}
.reveal .stat-block {
  background: #050b14 !important;
  border: 1px solid #10b981 !important;
  border-radius: 2px !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1) !important;
}
.reveal .badge {
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  color: #10b981 !important;
  border-radius: 2px !important;
}`
  },
  {
    id: 'corporate-minimal',
    name: 'Corporate Minimal',
    description: 'Clean consulting layout, utilizing card styling, clean lines, and Inter.',
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #f8fafc;
  --og-slide-text: #334155;
  --og-slide-muted: #64748b;
  --og-slide-accent: #2563eb;
  --og-slide-border: #e2e8f0;
  --og-slide-h1-size: 48px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Inter', sans-serif;
  --og-slide-font-body: 'Inter', sans-serif;
  --og-slide-radius: 12px;
  --og-slide-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
}
.reveal section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2.5em !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
}
.reveal .card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #334155 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
  border-radius: 8px !important;
}
.reveal .stat-block {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
}
.reveal .badge {
  background: rgba(37, 99, 235, 0.08) !important;
  border: 1px solid rgba(37, 99, 235, 0.2) !important;
  color: #2563eb !important;
  border-radius: 6px !important;
}`
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description:
      'Gradient dark-blue backdrop, designed for data analytics and finance presentations.',
    colors: {
      primary: '#0284C7',
      secondary: '#0369A1',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: linear-gradient(180deg, #0a0f1d 0%, #0369a1 100%);
  --og-slide-text: #f1f5f9;
  --og-slide-muted: #94a3b8;
  --og-slide-accent: #38bdf8;
  --og-slide-border: #1e293b;
  --og-slide-h1-size: 54px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Outfit', sans-serif;
  --og-slide-font-body: 'Plus Jakarta Sans', sans-serif;
  --og-slide-radius: 16px;
  --og-slide-shadow: 0 10px 25px rgba(3, 105, 161, 0.25);
}
.reveal {
  background: var(--background-gradient) !important;
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
}
.reveal .card {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid rgba(56, 189, 248, 0.2) !important;
  color: #f1f5f9 !important;
  backdrop-filter: blur(12px) !important;
  border-radius: 12px !important;
}
.reveal .stat-block {
  background: rgba(15, 23, 42, 0.5) !important;
  border: 1px solid rgba(56, 189, 248, 0.15) !important;
  border-radius: 12px !important;
}
.reveal .badge {
  background: rgba(56, 189, 248, 0.1) !important;
  border: 1px solid rgba(56, 189, 248, 0.25) !important;
  color: #38bdf8 !important;
  border-radius: 8px !important;
}`
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm charcoal background with eye-catching energetic orange accents.',
    colors: {
      primary: '#EA580C',
      secondary: '#C2410C',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #1c1917;
  --og-slide-text: #fafaf9;
  --og-slide-muted: #a8a29e;
  --og-slide-accent: #f97316;
  --og-slide-border: #292524;
  --og-slide-h1-size: 52px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Sora', sans-serif;
  --og-slide-font-body: 'Sora', sans-serif;
  --og-slide-radius: 8px;
  --og-slide-shadow: 0 8px 24px rgba(234, 88, 12, 0.15);
}
.reveal section h1, .reveal section h2 {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #f97316;
}
.reveal .card {
  background: rgba(28, 25, 22, 0.7) !important;
  border: 1px solid rgba(249, 115, 22, 0.2) !important;
  color: #fafaf9 !important;
  border-radius: 8px !important;
}
.reveal .stat-block {
  background: rgba(28, 25, 22, 0.6) !important;
  border: 1px solid rgba(249, 115, 22, 0.15) !important;
  border-radius: 8px !important;
}
.reveal .badge {
  background: rgba(249, 115, 22, 0.1) !important;
  border: 1px solid rgba(249, 115, 22, 0.3) !important;
  color: #f97316 !important;
  border-radius: 4px !important;
}`
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper',
    description: 'Relaxed cream textured backdrop. Ideal for editorials and deep dive journalism.',
    colors: {
      primary: '#451A03',
      secondary: '#78350F',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #fdfbf7;
  --og-slide-text: #292524;
  --og-slide-muted: #78716c;
  --og-slide-accent: #b45309;
  --og-slide-border: #d6d3d1;
  --og-slide-h1-size: 50px;
  --og-slide-body-size: 20px;
  --og-slide-font-heading: 'Cinzel', serif;
  --og-slide-font-body: 'EB Garamond', serif;
  --og-slide-radius: 0px;
  --og-slide-shadow: none;
}
.reveal section {
  padding: 3em !important;
  background: #faf7f2;
  border: 1px dashed #d6d3d1;
}
.reveal .card {
  background: #faf7f2 !important;
  border: 1px dashed #d6d3d1 !important;
  color: #292524 !important;
  box-shadow: none !important;
  border-radius: 4px !important;
}
.reveal .stat-block {
  background: #faf7f2 !important;
  border: 1px dashed #d6d3d1 !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}
.reveal .badge {
  background: rgba(180, 83, 9, 0.08) !important;
  border: 1px dashed rgba(180, 83, 9, 0.3) !important;
  color: #b45309 !important;
  border-radius: 4px !important;
}`
  },
  {
    id: 'forest-dark',
    name: 'Forest Dark',
    description: 'Deep forest green backdrop coupled with sustainability and earth tones.',
    colors: {
      primary: '#064E3B',
      secondary: '#065F46',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #022c22;
  --og-slide-text: #ecfdf5;
  --og-slide-muted: #a7f3d0;
  --og-slide-accent: #10b981;
  --og-slide-border: #064e3b;
  --og-slide-h1-size: 52px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Fraunces', serif;
  --og-slide-font-body: 'Montserrat', sans-serif;
  --og-slide-radius: 10px;
  --og-slide-shadow: 0 6px 20px rgba(16, 185, 129, 0.1);
}
.reveal section h1, .reveal section h2 {
  font-style: italic;
  font-weight: 700;
  color: #ecfdf5;
}
.reveal .card {
  background: rgba(2, 44, 34, 0.6) !important;
  border: 1px solid rgba(16, 185, 129, 0.2) !important;
  color: #ecfdf5 !important;
  border-radius: 10px !important;
}
.reveal .stat-block {
  background: rgba(2, 44, 34, 0.5) !important;
  border: 1px solid rgba(16, 185, 129, 0.15) !important;
  border-radius: 10px !important;
}
.reveal .badge {
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
  color: #10b981 !important;
  border-radius: 6px !important;
}`
  },
  {
    id: 'pastel-soft',
    name: 'Pastel Soft',
    description:
      'Calming pink and lavender cards. Friendly styling built for wellness and education.',
    colors: {
      primary: '#DB2777',
      secondary: '#BE185D',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #fff5f5;
  --og-slide-text: #4a5568;
  --og-slide-muted: #718096;
  --og-slide-accent: #db2777;
  --og-slide-border: #fed7d7;
  --og-slide-h1-size: 50px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Fredoka', sans-serif;
  --og-slide-font-body: 'Quicksand', sans-serif;
  --og-slide-radius: 20px;
  --og-slide-shadow: 0 10px 25px rgba(219, 39, 119, 0.06);
}
.reveal section {
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(219, 39, 119, 0.06);
  padding: 2.5em !important;
}
.reveal .card {
  background: #ffffff !important;
  border: 1px solid #fed7d7 !important;
  color: #4a5568 !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 16px rgba(219, 39, 119, 0.03) !important;
}
.reveal .stat-block {
  background: #ffffff !important;
  border: 1px solid #fed7d7 !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 16px rgba(219, 39, 119, 0.03) !important;
}
.reveal .badge {
  background: rgba(219, 39, 119, 0.08) !important;
  border: 1px solid rgba(219, 39, 119, 0.2) !important;
  color: #db2777 !important;
  border-radius: 12px !important;
}`
  },
  {
    id: 'noir-gold',
    name: 'Noir Gold',
    description: 'Ultra luxury golden borders surrounding an intense absolute black space.',
    colors: {
      primary: '#D97706',
      secondary: '#B45309',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #000000;
  --og-slide-text: #e5e7eb;
  --og-slide-muted: #9ca3af;
  --og-slide-accent: #f59e0b;
  --og-slide-border: #f59e0b;
  --og-slide-h1-size: 54px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Bodoni Moda', serif;
  --og-slide-font-body: 'Montserrat', sans-serif;
  --og-slide-radius: 0px;
  --og-slide-shadow: 0 0 15px rgba(245, 158, 11, 0.15);
}
.reveal section h1, .reveal section h2 {
  border-top: 1px solid #f59e0b;
  border-bottom: 1px solid #f59e0b;
  padding: 0.4em 0;
  letter-spacing: 0.08em;
}
.reveal .card {
  background: #080808 !important;
  border: 1px solid #f59e0b !important;
  color: #e5e7eb !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.1) !important;
  border-radius: 0px !important;
}
.reveal .stat-block {
  background: #080808 !important;
  border: 1px solid #f59e0b !important;
  border-radius: 0px !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.08) !important;
}
.reveal .badge {
  background: rgba(245, 158, 11, 0.1) !important;
  border: 1px solid #f59e0b !important;
  color: #f59e0b !important;
  border-radius: 0px !important;
}`
  },
  {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    description: 'Immersive deep violet and purple gradients curated for creative agencies.',
    colors: {
      primary: '#6D28D9',
      secondary: '#5B21B6',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: linear-gradient(135deg, #0f0a1e 0%, #1e1138 100%);
  --og-slide-text: #f5f3ff;
  --og-slide-muted: #c084fc;
  --og-slide-accent: #a78bfa;
  --og-slide-border: #2e1065;
  --og-slide-h1-size: 56px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Outfit', sans-serif;
  --og-slide-font-body: 'DM Sans', sans-serif;
  --og-slide-radius: 14px;
  --og-slide-shadow: 0 8px 32px rgba(109, 40, 217, 0.2);
}
.reveal {
  background: var(--background-gradient) !important;
}
.reveal .card {
  background: rgba(15, 10, 30, 0.6) !important;
  border: 1px solid rgba(167, 139, 250, 0.2) !important;
  color: #f5f3ff !important;
  border-radius: 12px !important;
}
.reveal .stat-block {
  background: rgba(15, 10, 30, 0.5) !important;
  border: 1px solid rgba(167, 139, 250, 0.15) !important;
  border-radius: 12px !important;
}
.reveal .badge {
  background: rgba(167, 139, 250, 0.1) !important;
  border: 1px solid rgba(167, 139, 250, 0.25) !important;
  color: #a78bfa !important;
  border-radius: 8px !important;
}`
  },
  {
    id: 'grid-paper',
    name: 'Grid Paper',
    description:
      'Technical grid blueprint pattern. Crafted for design, engineering, and architecture.',
    colors: {
      primary: '#0F172A',
      secondary: '#1E293B',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #ffffff;
  --og-slide-text: #334155;
  --og-slide-muted: #64748b;
  --og-slide-accent: #2563eb;
  --og-slide-border: #0f172a;
  --og-slide-h1-size: 48px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Space Grotesk', sans-serif;
  --og-slide-font-body: 'Space Grotesk', sans-serif;
  --og-slide-radius: 4px;
  --og-slide-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
.reveal {
  background-size: 30px 30px !important;
  background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px) !important;
}
.reveal section {
  background: #ffffff;
  border: 3px solid #0f172a;
  padding: 2.2em !important;
}
.reveal .card {
  background: #ffffff !important;
  border: 2px solid #0f172a !important;
  color: #334155 !important;
  border-radius: 4px !important;
  box-shadow: 4px 4px 0px #0f172a !important;
}
.reveal .stat-block {
  background: #ffffff !important;
  border: 2px solid #0f172a !important;
  border-radius: 4px !important;
  box-shadow: 4px 4px 0px #0f172a !important;
}
.reveal .badge {
  background: #0f172a !important;
  border: 2px solid #0f172a !important;
  color: #ffffff !important;
  border-radius: 4px !important;
}`
  },
  {
    id: 'red-accent',
    name: 'Red Accent',
    description: 'Bold red side-accent lines. Highlights urgency, metrics, and high-impact sales.',
    colors: {
      primary: '#DC2626',
      secondary: '#B91C1C',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #ffffff;
  --og-slide-text: #1f2937;
  --og-slide-muted: #4b5563;
  --og-slide-accent: #dc2626;
  --og-slide-border: #e5e7eb;
  --og-slide-h1-size: 50px;
  --og-slide-body-size: 18px;
  --og-slide-font-heading: 'Lexend', sans-serif;
  --og-slide-font-body: 'Inter', sans-serif;
  --og-slide-radius: 6px;
  --og-slide-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.reveal section {
  border-left: 10px solid #dc2626;
  background: #fbfbfb;
  padding: 2.5em !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.reveal .card {
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  border-left: 5px solid #dc2626 !important;
  color: #1f2937 !important;
  border-radius: 4px !important;
}
.reveal .stat-block {
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  border-left: 5px solid #dc2626 !important;
  border-radius: 4px !important;
}
.reveal .badge {
  background: rgba(220, 38, 38, 0.08) !important;
  border: 1px solid rgba(220, 38, 38, 0.2) !important;
  color: #dc2626 !important;
  border-radius: 4px !important;
}`
  },
  {
    id: 'void-lime',
    name: 'Void Lime',
    description: 'Intense green glow against dark matter. Built for cyberpunk and gamers.',
    colors: {
      primary: '#84CC16',
      secondary: '#65A30D',
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


  /* Open Gamma Design System Variables */
    --og-slide-bg: #030712;
  --og-slide-text: #ecfdf5;
  --og-slide-muted: #6ee7b7;
  --og-slide-accent: #84cc16;
  --og-slide-border: #374151;
  --og-slide-h1-size: 52px;
  --og-slide-body-size: 16px;
  --og-slide-font-heading: 'Syncopate', sans-serif;
  --og-slide-font-body: 'Share Tech Mono', monospace;
  --og-slide-radius: 0px;
  --og-slide-shadow: 0 0 20px rgba(132, 204, 22, 0.3);
}
.reveal section h1, .reveal section h2 {
  text-shadow: 0 0 12px rgba(132, 204, 22, 0.6);
}
.reveal .card {
  background: #05080f !important;
  border: 1px solid #84cc16 !important;
  color: #ecfdf5 !important;
  box-shadow: 0 0 15px rgba(132, 204, 22, 0.2) !important;
  border-radius: 0px !important;
}
.reveal .stat-block {
  background: #05080f !important;
  border: 1px solid #84cc16 !important;
  border-radius: 0px !important;
  box-shadow: 0 0 15px rgba(132, 204, 22, 0.15) !important;
}
.reveal .badge {
  background: rgba(132, 204, 22, 0.1) !important;
  border: 1px solid rgba(132, 204, 22, 0.3) !important;
  color: #84cc16 !important;
  border-radius: 0px !important;
}`
  }
]
