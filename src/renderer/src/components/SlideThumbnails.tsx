import React, { useRef, useEffect } from 'react'
import type { Slide, Theme } from '../types'

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
  onRegenerateSlide
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
    <div className="w-full flex flex-col gap-2.5 no-drag mt-2">
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
          Slide Outline & Outline Preview
        </label>
        <span className="text-[10px] text-neutral-400 font-medium">
          Slide <span className="font-semibold text-yellow-400">{activeSlideIndex + 1}</span> of{' '}
          {slides.length}
        </span>
      </div>

      {/* Horizontal Strip */}
      <div
        ref={containerRef}
        className="thumbnails-scroll-container flex gap-4 overflow-x-auto pb-2 pt-1 snap-x scroll-smooth"
      >
        {slides.map((slide, index) => {
          const isActive = index === activeSlideIndex

          // Build a sandboxed preview HTML frame combining fonts, design tokens, and slide content
          const fontImport = (activeTheme as any).fontImport || ''
          const srcDoc = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  ${fontImport}
                  ${activeTheme.cssTokens}
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

          return (
            <div
              key={slide.id}
              data-slide-index={index}
              onClick={() => onSelectSlide(index)}
              className={`flex-shrink-0 relative w-[160px] h-[90px] rounded-lg border cursor-pointer select-none snap-start overflow-hidden group transition-all duration-300 transform active:scale-98 ${
                isActive
                  ? 'border-yellow-400 ring-2 ring-yellow-400/20'
                  : 'border-neutral-800 hover:border-neutral-700/80 hover:bg-neutral-900/40'
              }`}
            >
              {/* Scaled HTML preview iframe */}
              <iframe
                srcDoc={srcDoc}
                style={{
                  width: '1280px',
                  height: '720px',
                  border: 'none',
                  transform: 'scale(0.125)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none'
                }}
                title={`Thumbnail Slide ${index + 1}`}
              />

              {/* Slide number badge bottom-left */}
              <span className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-bold text-neutral-300 pointer-events-none">
                {index + 1}
              </span>

              {/* Hover action overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2.5 z-20">
                {/* Edit Pencil Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditSlide(index)
                  }}
                  className="p-1.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Edit Slide"
                >
                  <svg
                    className="w-3.5 h-3.5"
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

                {/* Regenerate Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegenerateSlide(index)
                  }}
                  className="p-1.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Regenerate Slide"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SlideThumbnails
