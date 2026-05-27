export const GLOBAL_LAYOUT_CSS = `
  /* Full-bleed split layouts */
  section.og-full-bleed-split {
    padding: 0 !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: stretch !important;
    align-items: stretch !important;
    text-align: left !important;
    box-sizing: border-box !important;
  }
  .reveal .slides section.og-full-bleed-split.past,
  .reveal .slides section.og-full-bleed-split.future {
    display: none !important;
  }
  section.og-full-bleed-split .og-split-layout {
    flex: 1 1 0% !important;
    min-height: 0 !important;
    height: 100% !important;
    display: grid !important;
    align-items: stretch !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  section.og-full-bleed-split .og-split-layout.og-img-on-left {
    grid-template-columns: 0.95fr 1.05fr !important;
  }
  section.og-full-bleed-split .og-split-layout.og-img-on-right {
    grid-template-columns: 1.05fr 0.95fr !important;
  }

  /* Split text column */
  .og-text-column {
    display: flex !important;
    flex-direction: column !important;
    justify-content: safe center !important;
    padding: 60px 60px 60px 80px !important;
    box-sizing: border-box !important;
    text-align: left !important;
    overflow-y: auto !important;
    min-height: 0 !important;
  }
  section.og-full-bleed-split .og-split-layout.og-img-on-left .og-text-column {
    padding: 60px 80px 60px 60px !important;
  }

  /* Image column — flex-based so it fills the grid cell top-to-bottom */
  .og-image-column {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
  }
  .og-image-column figure,
  .og-image-column figure.og-image-figure,
  .og-image-column figure.og-image-placeholder {
    flex: 1 1 0% !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }

  /* Full-bleed cover images inside image column */
  .og-image-column img {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    display: block !important;
    flex-shrink: 0 !important;
  }

  /* Standalone figure (not inside og-image-column) */
  figure.og-image-figure:not(.og-image-column figure) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    margin: 0 !important;
    border-radius: 14px !important;
    overflow: hidden !important;
  }
  figure.og-image-figure:not(.og-image-column figure) img {
    max-width: 100% !important;
    max-height: 380px !important;
    border-radius: 12px !important;
    object-fit: cover !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
  }

  /* Inline diagrams & graphics (non-full-bleed sections) */
  section:not(.og-full-bleed-split) img:not(.og-image-column img) {
    object-fit: contain !important;
    background: transparent !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
    border: 1px solid var(--og-slide-border, rgba(255, 255, 255, 0.08)) !important;
    border-radius: 12px !important;
  }

  /* ── Design System Layouts ── */
  .cols {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
    gap: 30px !important;
    align-items: stretch !important;
    width: 100% !important;
    margin-top: 25px !important;
    text-align: left;
  }
  .col {
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
  }

  /* Stack cards vertically inside narrow split text columns */
  .og-text-column .cols {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  /* Premium Card UI */
  .card {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-left: 5px solid var(--og-slide-accent, #e8ff57) !important;
    border-radius: var(--og-slide-radius, 12px) !important;
    border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    padding: 24px !important;
    box-sizing: border-box !important;
    box-shadow: var(--og-slide-shadow, 0 10px 30px rgba(0, 0, 0, 0.2)) !important;
    text-align: left !important;
    backdrop-filter: blur(12px) !important;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease !important;
  }
  .card:hover {
    border-color: rgba(255, 255, 255, 0.15) !important;
  }
  .card h3 {
    margin-top: 0 !important;
    margin-bottom: 12px !important;
    font-size: 1.25em !important;
    font-family: var(--og-slide-font-heading, sans-serif) !important;
    color: var(--og-slide-text, #ede9e1) !important;
  }
  .card p {
    margin: 0 !important;
    font-size: 0.9em !important;
    line-height: 1.5 !important;
    color: var(--og-slide-text, #bab6ae) !important;
    opacity: 0.9 !important;
  }
  .card ul,
  .card ol {
    padding-left: 24px !important;
    margin-left: 0 !important;
  }

  /* Statistics Display */
  .stat-block {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    padding: 24px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid var(--og-slide-border, rgba(255, 255, 255, 0.06)) !important;
    border-radius: var(--og-slide-radius, 12px) !important;
    box-sizing: border-box !important;
    backdrop-filter: blur(8px) !important;
    box-shadow: var(--og-slide-shadow, 0 8px 24px rgba(0, 0, 0, 0.15)) !important;
  }
  .stat-number {
    font-size: 3.4em !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    color: var(--og-slide-accent, #e8ff57) !important;
    margin-bottom: 8px !important;
    text-shadow: 0 0 15px rgba(232, 255, 87, 0.15) !important;
    font-family: var(--og-slide-font-heading, sans-serif) !important;
  }
  .stat-label {
    font-size: 0.8em !important;
    font-weight: 700 !important;
    color: var(--og-slide-text, #ede9e1) !important;
    opacity: 0.8 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
    font-family: var(--og-slide-font-body, sans-serif) !important;
  }

  /* Testimonials & Pull Quotes */
  .quote-block {
    border-left: 4px solid var(--og-slide-accent, #e8ff57) !important;
    padding-left: 24px !important;
    text-align: left !important;
    margin: 30px auto !important;
    max-width: 85% !important;
    font-style: italic !important;
    box-sizing: border-box !important;
    background: rgba(255, 255, 255, 0.01) !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
  }
  .quote-text {
    font-size: 1.3em !important;
    line-height: 1.4 !important;
    font-weight: 500 !important;
    margin-bottom: 12px !important;
    color: var(--og-slide-text, #ede9e1) !important;
    font-family: var(--og-slide-font-body, sans-serif) !important;
  }
  .quote-author {
    font-size: 0.85em !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    color: var(--og-slide-muted, #9ca3af) !important;
    font-style: normal !important;
    letter-spacing: 0.08em !important;
    font-family: var(--og-slide-font-body, sans-serif) !important;
  }

  /* Pill Badges */
  .badge {
    display: inline-block !important;
    background: rgba(232, 255, 87, 0.1) !important;
    border: 1px solid rgba(232, 255, 87, 0.2) !important;
    color: var(--og-slide-accent, #e8ff57) !important;
    padding: 5px 14px !important;
    border-radius: 9999px !important;
    font-size: 0.7em !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.12em !important;
    margin-bottom: 20px !important;
    font-family: var(--og-slide-font-body, sans-serif) !important;
  }

  /* Numbered Card UI */
  .card.numbered {
    position: relative !important;
    padding-top: 38px !important;
  }
  .card.numbered::before {
    content: attr(data-number) !important;
    position: absolute !important;
    top: -18px !important;
    left: 24px !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 50% !important;
    background: var(--og-slide-accent, #e8ff57) !important;
    color: #000000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-weight: 800 !important;
    font-size: 0.85em !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }

  /* Bottom Component Trays */
  .og-bottom-tray {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid var(--og-slide-border, rgba(255, 255, 255, 0.06)) !important;
    border-radius: 16px !important;
    padding: 24px !important;
    margin-top: 32px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  
  /* Lightweight Inline HTML Charts */
  .og-inline-chart {
    display: flex !important;
    align-items: flex-end !important;
    gap: 16px !important;
    height: 120px !important;
    padding-bottom: 24px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    margin-bottom: 20px !important;
    box-sizing: border-box !important;
  }
  .og-chart-bar {
    flex: 1 !important;
    background: var(--og-slide-accent, #e8ff57) !important;
    border-radius: 6px 6px 0 0 !important;
    position: relative !important;
  }
  .og-chart-bar::after {
    content: attr(data-label) !important;
    position: absolute !important;
    bottom: -24px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    color: var(--og-slide-text) !important;
    opacity: 0.6 !important;
  }

  /* ── Premium Modern Design System Extensions ── */
  
  /* Glassmorphism Premium Cards */
  .reveal .card.og-glass-card {
    background: rgba(255, 255, 255, 0.04) !important;
    backdrop-filter: blur(16px) saturate(120%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(120%) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-left: 6px solid var(--og-slide-accent, #e8ff57) !important;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }
  .reveal .card.og-glass-card:hover {
    transform: translateY(-4px) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35), 0 0 15px rgba(255, 255, 255, 0.03) !important;
  }

  /* Asymmetric Columns (60/40 Split) */
  .og-asymmetric-split {
    display: grid !important;
    grid-template-columns: 1.2fr 0.8fr !important;
    gap: 32px !important;
    align-items: stretch !important;
    width: 100% !important;
  }
  .og-asymmetric-split.reverse {
    grid-template-columns: 0.8fr 1.2fr !important;
  }

  /* Connected Timeline Grid */
  .og-timeline-track {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
    gap: 24px !important;
    position: relative !important;
    margin-top: 30px !important;
    width: 100% !important;
  }
  .og-timeline-step {
    position: relative !important;
    padding: 24px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 12px !important;
    box-sizing: border-box !important;
    transition: all 0.3s ease !important;
  }
  .og-timeline-step::after {
    content: "→" !important;
    position: absolute !important;
    right: -16px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    font-size: 1.5em !important;
    color: var(--og-slide-accent, #e8ff57) !important;
    opacity: 0.5 !important;
    font-weight: 700 !important;
  }
  .og-timeline-step:last-child::after {
    display: none !important;
  }
  .og-timeline-step:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: var(--og-slide-accent, #e8ff57) !important;
  }
  .og-timeline-number {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    background: var(--og-slide-accent, #e8ff57) !important;
    color: #000000 !important;
    font-weight: 900 !important;
    font-size: 0.8em !important;
    margin-bottom: 12px !important;
  }

  /* Premium Focal Stat Displays */
  .og-focal-stat {
    text-align: center !important;
    padding: 32px !important;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
    margin: 20px auto !important;
    max-width: 500px !important;
  }
  .og-focal-stat .stat-number {
    font-size: 4.8em !important;
    letter-spacing: -0.03em !important;
    background: linear-gradient(135deg, #ffffff 30%, var(--og-slide-accent, #e8ff57) 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
  }
  
  /* Fine-tuned border safety rules */
  .reveal .card ul,
  .reveal .card ol {
    padding-left: 24px !important;
    margin-left: 0 !important;
  }
`;
