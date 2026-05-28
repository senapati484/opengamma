import React, { useRef, useEffect } from 'react'
import type { Slide, Theme } from '../types'
import { GLOBAL_LAYOUT_CSS } from '../lib/layoutStyles'

export interface SlideThumbnailsProps {
  /** Ordered list of slides in the presentation */
  slides: Slide[]
  /** Index of the active/selected slide */
  activeSlideIndex: number
  /** Selected theme to apply tokens inside slide iframes */
  activeTheme: Theme
  /** Select slide callback */
  onSelectSlide: (index: number) => void
  /** Edit slide action callback */
  onEditSlide: (index: number) => void
  /** Regenerate slide action callback */
  onRegenerateSlide: (index: number) => void
  /** Index of slide currently regenerating, if any */
  regeneratingIndex?: number | null
}

/**
 * SlideThumbnails - horizontal mini slide strip container.
 * Displays each slide in a sandboxed, scaled-down 16:9 iframe.
 * Includes slide badges, edit & regenerate hover action overlays,
 * and smooth active slide scrolling.
 */
export const SlideThumbnails: React.FC<SlideThumbnailsProps> = ({
  slides,
  activeSlideIndex,
  activeTheme,
  onSelectSlide,
  onEditSlide,
  onRegenerateSlide,
  regeneratingIndex
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Smooth scroll container to active slide card
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeCard = container.querySelector(`[data-slide-index="${activeSlideIndex}"]`)
    if (activeCard) {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [activeSlideIndex, slides.length])

  return (
    <div className="w-full flex flex-col gap-2 no-drag">
      {/* Scrollbar hiding styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .thumbnails-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
        .thumbnails-scroll-container {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `
        }}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Slides
        </label>
        <span className="text-[10px] text-neutral-400 font-medium">
          <span className="font-semibold text-[#e8ff57]">{activeSlideIndex + 1}</span> of{' '}
          {slides.length}
        </span>
      </div>

      {/* Horizontal Strip */}
      <div
        ref={containerRef}
        className="thumbnails-scroll-container flex gap-3 overflow-x-auto pb-1.5 pt-0.5 snap-x scroll-smooth"
      >
        {slides.map((slide, index) => {
          const isActive = index === activeSlideIndex

          // Build a sandboxed preview HTML frame
          const fontImport = (activeTheme as any).fontImport || ''
          const srcDoc = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  ${fontImport}
                  ${activeTheme.cssTokens}
                  ${GLOBAL_LAYOUT_CSS}
                  .slide-wrapper:has(.og-full-bleed-split) {
                    padding: 0 !important;
                    align-items: stretch !important;
                    justify-content: stretch !important;
                  }
                  html, body {
                    width: 1280px;
                    height: 720px;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    box-sizing: border-box;
                    background: var(--og-slide-bg, #0d0d0d);
                    color: var(--og-slide-text, #ffffff);
                  }
                  .slide-wrapper {
                    width: 1280px;
                    height: 720px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 60px;
                    box-sizing: border-box;
                    text-align: center;
                  }
                  h1, h2, h3 {
                    font-family: var(--og-slide-font-heading, sans-serif);
                    color: var(--og-slide-text);
                    margin-top: 0;
                  }
                  p, li {
                    font-family: var(--og-slide-font-body, sans-serif);
                    font-size: 28px;
                    line-height: 1.5;
                  }
                  .accent, strong {
                    color: var(--og-slide-accent, #38bdf8) !important;
                  }
                  section {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    box-sizing: border-box;
                  }
                  /* Full-bleed split: override default centering */
                  section.og-full-bleed-split {
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: stretch !important;
                    align-items: stretch !important;
                    text-align: left !important;
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
                  }
                  section.og-full-bleed-split .og-split-layout.og-img-on-left {
                    grid-template-columns: 0.95fr 1.05fr !important;
                  }
                  section.og-full-bleed-split .og-split-layout.og-img-on-right {
                    grid-template-columns: 1.05fr 0.95fr !important;
                  }
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
                  .og-image-column figure {
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
                  }
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
                  }
                </style>
              </head>
              <body>
                <div class="slide-wrapper">
                  ${slide.html}
                </div>
              </body>
            </html>
          `

          const isRegenerating = index === regeneratingIndex

          return (
            <div
              key={slide.id}
              data-slide-index={index}
              onClick={() => {
                if (isRegenerating) return
                onSelectSlide(index)
              }}
              className={`flex-shrink-0 relative w-[152px] h-[86px] rounded-xl border select-none snap-start overflow-hidden group transition-all duration-200 transform active:scale-[0.98] ${
                isRegenerating
                  ? 'border-amber-300 cursor-wait shadow-sm shadow-amber-100'
                  : isActive
                    ? 'border-[#e8ff57] ring-2 ring-[#e8ff57]/15 cursor-pointer shadow-sm shadow-[#e8ff57]/10'
                    : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm cursor-pointer bg-white'
              }`}
            >
              {/* Scaled HTML preview iframe */}
              <iframe
                srcDoc={srcDoc}
                style={{
                  width: '1280px',
                  height: '720px',
                  border: 'none',
                  transform: 'scale(0.1188)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none'
                }}
                title={`Thumbnail Slide ${index + 1}`}
              />

              {/* Slide number badge */}
              <span
                className={`absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold pointer-events-none ${
                  isActive
                    ? 'bg-[#e8ff57] text-black'
                    : 'bg-white/90 text-neutral-500 border border-neutral-200'
                }`}
              >
                {index + 1}
              </span>

              {/* Regenerating overlay */}
              {isRegenerating && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-30 pointer-events-none animate-fade-in">
                  <svg
                    className="animate-spin h-4 w-4 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-[9px] font-bold text-amber-600 tracking-wide">
                    Regenerating…
                  </span>
                </div>
              )}

              {/* Hover action overlay */}
              {!isRegenerating && (
                <div className="absolute inset-0 bg-neutral-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 z-20">
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditSlide(index)
                    }}
                    className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Edit Slide"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                      />
                    </svg>
                  </button>

                  {/* Regenerate button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRegenerateSlide(index)
                    }}
                    className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Regenerate Slide"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SlideThumbnails
