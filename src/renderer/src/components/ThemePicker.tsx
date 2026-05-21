import React from 'react'
import type { Theme } from '../types'

export interface ThemePickerProps {
  /** Array of available design themes to display */
  themes: Theme[]
  /** The currently selected theme */
  selectedTheme: Theme | null
  /** Callback triggered when a theme card is clicked */
  onSelect: (theme: Theme) => void
}

const themeTags: Record<string, string> = {
  'startup-gradient': 'Dark · Gradient · Bold',
  'academic-clean': 'Light · Serif · Editorial',
  'a11y-dark': 'Dark · High-Contrast · Accessible',
  'terminal-green': 'Dark · Monospace · Cyber',
  'corporate-minimal': 'Light · Sans-Serif · Professional',
  'deep-ocean': 'Dark · Gradient · Corporate',
  ember: 'Dark · Accent · Energetic',
  'warm-paper': 'Light · Serif · Vintage',
  'forest-dark': 'Dark · Serif · Eco',
  'pastel-soft': 'Light · Rounded · Playful',
  'noir-gold': 'Dark · Luxury · Gold',
  'midnight-violet': 'Dark · Gradient · Agency',
  'grid-paper': 'Light · Technical · Blueprint',
  'red-accent': 'Light · Bold · Sales',
  'void-lime': 'Dark · Monospace · Cyber'
}

const getThemeBackground = (theme: Theme) => {
  const gradientMatch = theme.cssTokens.match(/linear-gradient\([^)]+\)/)
  if (gradientMatch) {
    return gradientMatch[0]
  }
  return theme.colors.bg
}

const getThemeFontHeading = (theme: Theme) => {
  const match = theme.cssTokens.match(/--r-heading-font:\s*['"]?([^,'";]+)['"]?/)
  return match ? match[1].trim() : 'sans-serif'
}

const getThemeFontBody = (theme: Theme) => {
  const match = theme.cssTokens.match(/--r-main-font:\s*['"]?([^,'";]+)['"]?/)
  return match ? match[1].trim() : 'sans-serif'
}

const getMiniPreviewStyles = (theme: Theme) => {
  const bg = getThemeBackground(theme)
  const fontHeading = getThemeFontHeading(theme)
  const fontBody = getThemeFontBody(theme)

  let containerStyle: React.CSSProperties = {
    background: bg,
    color: theme.colors.text,
    fontFamily: `"${fontBody}", sans-serif`,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    position: 'relative'
  }

  let sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    height: '100%',
    justifyContent: 'center'
  }

  let h2Style: React.CSSProperties = {
    fontFamily: `"${fontHeading}", sans-serif`,
    color: theme.colors.primary,
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    lineHeight: '1.2'
  }

  let ulStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '14px',
    fontSize: '10px',
    color: theme.colors.text,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    listStyleType: 'disc'
  }

  let liAccentStyle: React.CSSProperties = {
    color: theme.colors.accent,
    fontWeight: 'bold'
  }

  // Specific custom treatments matching each theme's unique identity:
  if (theme.id === 'academic-clean') {
    sectionStyle.textAlign = 'left'
    h2Style.fontStyle = 'italic'
    h2Style.borderBottom = '1px solid #e5e7eb'
    h2Style.paddingBottom = '2px'
  } else if (theme.id === 'corporate-minimal') {
    containerStyle.background = '#f8fafc'
    sectionStyle.background = '#ffffff'
    sectionStyle.border = '1px solid #e2e8f0'
    sectionStyle.borderRadius = '6px'
    sectionStyle.padding = '10px'
    sectionStyle.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)'
  } else if (theme.id === 'warm-paper') {
    containerStyle.background = '#fdfbf7'
    sectionStyle.background = '#faf7f2'
    sectionStyle.border = '1px dashed #d6d3d1'
    sectionStyle.padding = '10px'
  } else if (theme.id === 'pastel-soft') {
    containerStyle.background = '#fff5f5'
    sectionStyle.background = '#ffffff'
    sectionStyle.borderRadius = '10px'
    sectionStyle.padding = '10px'
    sectionStyle.boxShadow = '0 2px 6px rgba(219,39,119,0.04)'
  } else if (theme.id === 'noir-gold') {
    h2Style.borderTop = '1px solid #f59e0b'
    h2Style.borderBottom = '1px solid #f59e0b'
    h2Style.padding = '3px 0'
    h2Style.letterSpacing = '0.04em'
    h2Style.textAlign = 'center'
  } else if (theme.id === 'grid-paper') {
    containerStyle.backgroundSize = '10px 10px'
    containerStyle.backgroundImage =
      'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)'
    sectionStyle.background = '#ffffff'
    sectionStyle.border = '2px solid #0f172a'
    sectionStyle.padding = '8px'
  } else if (theme.id === 'red-accent') {
    sectionStyle.background = '#fbfbfb'
    sectionStyle.borderLeft = '4px solid #dc2626'
    sectionStyle.padding = '8px'
    sectionStyle.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'
  } else if (theme.id === 'terminal-green') {
    h2Style.textShadow = '0 0 6px rgba(16, 185, 129, 0.5)'
  } else if (theme.id === 'void-lime') {
    h2Style.textShadow = '0 0 6px rgba(132, 204, 22, 0.6)'
    h2Style.textTransform = 'uppercase'
  } else if (theme.id === 'startup-gradient') {
    h2Style.background = 'linear-gradient(135deg, #ffffff 30%, #f472b6 100%)'
    ;(h2Style as any).WebkitBackgroundClip = 'text'
    ;(h2Style as any).WebkitTextFillColor = 'transparent'
    h2Style.textShadow = '0 2px 8px rgba(139, 92, 246, 0.3)'
  } else if (theme.id === 'ember') {
    h2Style.textTransform = 'uppercase'
    h2Style.letterSpacing = '-0.02em'
  }

  return { containerStyle, sectionStyle, h2Style, ulStyle, liAccentStyle }
}

/**
 * A highly interactive, premium horizontal theme selector.
 * Draws swatches styled like mini presentation slides using the actual background,
 * text, primary, and accent colors from the active theme. Uses smooth physics-based
 * hover animations and color-matched focus glows.
 */
export const ThemePicker: React.FC<ThemePickerProps> = ({ themes, selectedTheme, onSelect }) => {
  const [hoveredTheme, setHoveredTheme] = React.useState<Theme | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{
    left: number
    top: number
  } | null>(null)

  const handleMouseEnter = (theme: Theme, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredTheme(theme)
    const rect = event.currentTarget.getBoundingClientRect()
    const parentRect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (parentRect) {
      const parentWidth = parentRect.width
      let left = rect.left - parentRect.left + (rect.width - 280) / 2
      // Constrain within parent bounds with 8px margin
      left = Math.max(8, Math.min(left, parentWidth - 280 - 8))

      // Calculate top above the card
      const top = rect.top - parentRect.top - 170 // 158px height + 12px gap
      setTooltipPosition({ left, top })
    }
  }

  const handleMouseLeave = () => {
    setHoveredTheme(null)
    setTooltipPosition(null)
  }

  const handleScroll = () => {
    setHoveredTheme(null)
    setTooltipPosition(null)
  }

  return (
    <div className="w-full flex flex-col gap-2.5 no-drag relative">
      {/* Self-contained custom styling for smooth scrollbars & smooth animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .theme-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
        .theme-scroll-container {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-tooltip-in {
          animation: tooltip-fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `
        }}
      />

      {/* Title block with helper label */}
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          Design Theme
        </label>
        {selectedTheme && (
          <span className="text-xs text-neutral-400 font-medium transition-all duration-200">
            Selected:{' '}
            <span className="font-semibold" style={{ color: selectedTheme.colors.accent }}>
              {selectedTheme.name}
            </span>
          </span>
        )}
      </div>

      {/* Horizontal Scrollable Row of Theme Cards */}
      <div
        onScroll={handleScroll}
        className="theme-scroll-container flex gap-4.5 overflow-x-auto pb-3.5 pt-1.5 snap-x scroll-smooth scrollbar-thin"
      >
        {themes.map((theme) => {
          const isSelected = selectedTheme?.id === theme.id

          return (
            <div
              key={theme.id}
              onClick={() => onSelect(theme)}
              onMouseEnter={(e) => handleMouseEnter(theme, e)}
              onMouseLeave={handleMouseLeave}
              className={`flex-shrink-0 w-60 rounded-xl border cursor-pointer select-none transition-all duration-300 ease-out snap-start flex flex-col overflow-hidden transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
                isSelected
                  ? 'bg-neutral-900/80 shadow-2xl'
                  : 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700/80 hover:bg-neutral-900/40'
              }`}
              style={{
                borderColor: isSelected ? theme.colors.accent : undefined,
                boxShadow: isSelected
                  ? `0 12px 24px -6px rgba(0, 0, 0, 0.6), 0 0 16px -2px ${theme.colors.accent}24`
                  : undefined
              }}
            >
              {/* Top Section: Visual Swatch & Layout Template Mockup */}
              <div
                className="h-24 w-full relative flex flex-col justify-between p-3.5 overflow-hidden border-b border-neutral-800/60"
                style={{ backgroundColor: theme.colors.bg }}
              >
                {/* Horizontal Palette Swatch Dot Indicator Block */}
                <div className="flex gap-1.5 z-10">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: theme.colors.bg }}
                    title={`Background: ${theme.colors.bg}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: theme.colors.primary }}
                    title={`Primary: ${theme.colors.primary}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: theme.colors.accent }}
                    title={`Accent: ${theme.colors.accent}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: theme.colors.text }}
                    title={`Text: ${theme.colors.text}`}
                  />
                </div>

                {/* Stylized mock layout simulating a structural slide inside the swatch */}
                <div className="flex flex-col gap-2 w-full mt-2.5 opacity-85 select-none">
                  {/* Mock Heading */}
                  <div
                    className="h-3 w-8/12 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  {/* Mock Paragraph lines */}
                  <div className="flex flex-col gap-1 w-full">
                    <div
                      className="h-1.5 w-11/12 rounded-full"
                      style={{ backgroundColor: theme.colors.text }}
                    />
                    <div
                      className="h-1.5 w-7/12 rounded-full"
                      style={{ backgroundColor: theme.colors.text }}
                    />
                  </div>
                </div>

                {/* Premium Round Selection Badge */}
                {isSelected && (
                  <div
                    className="absolute top-2.5 right-2.5 z-20 flex items-center justify-center w-5.5 h-5.5 rounded-full shadow-lg border border-black/10 animate-fade-in"
                    style={{ backgroundColor: theme.colors.accent }}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-black font-extrabold"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Lower Section: Theme Details */}
              <div className="p-3.5 flex flex-col justify-between flex-grow">
                <div>
                  <h4 className="font-semibold text-sm tracking-wide text-neutral-100">
                    {theme.name}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>
                </div>

                {/* Premium Preview block in the footer */}
                <div className="mt-3.5 pt-3.5 border-t border-neutral-800/40 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-neutral-500">
                      Preview
                    </span>
                    <div className="flex gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.primary }}
                        title="Primary"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Accent"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.bg }}
                        title="Background"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-300 truncate max-w-[120px]">
                      {theme.name}
                    </span>
                    <span className="text-[9.5px] text-neutral-400 font-medium whitespace-nowrap bg-neutral-900/60 px-1.5 py-0.5 rounded border border-neutral-800/60">
                      {themeTags[theme.id] || 'Modern · Clean'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating Interactive Hover Tooltip Slide Preview */}
      {hoveredTheme &&
        tooltipPosition &&
        (() => {
          const { containerStyle, sectionStyle, h2Style, ulStyle, liAccentStyle } =
            getMiniPreviewStyles(hoveredTheme)
          const fontImport = (hoveredTheme as any).fontImport || ''

          return (
            <div
              className="absolute z-50 pointer-events-none w-[280px] h-[158px] rounded-xl overflow-hidden border border-neutral-700/50 bg-neutral-950/90 animate-tooltip-in"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.7), 0 0 20px -2px ${hoveredTheme.colors.accent}1c`
              }}
            >
              {fontImport && <style dangerouslySetInnerHTML={{ __html: fontImport }} />}
              <div style={containerStyle}>
                <div style={sectionStyle}>
                  <h2 style={h2Style}>Slide Title</h2>
                  <ul style={ulStyle}>
                    <li>
                      Key topic with <span style={liAccentStyle}>accent highlight</span>
                    </li>
                    <li>Supporting bullet point details</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}

export default ThemePicker
