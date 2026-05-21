import React, { useRef, useEffect, useState } from 'react'
import type { Slide, Theme, StreamStatus } from '../types'

export interface SlidePreviewProps {
  /** The current array of presentation slides */
  slides: Slide[]
  /** The currently selected design theme and colors */
  activeTheme: Theme
  /** Stream status reflecting the current Claude generation lifecycle state */
  status: StreamStatus
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({ slides, activeTheme, status }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const injectedSlideIds = useRef<Set<string>>(new Set())

  // ─── Direct DOM Injection Helper ───────────────────────────────────────────
  // Clears and re-injects all slides into the iframe to keep everything in sync
  const reinjectAllSlides = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    try {
      // 1. Clear existing slides inside the host
      if ((contentWindow as any).clearSlides) {
        ;(contentWindow as any).clearSlides()
      } else {
        contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
    }

    injectedSlideIds.current.clear()

    // 2. Add each slide to the host
    slides.forEach((slide) => {
      try {
        if ((contentWindow as any).addSlide) {
          ;(contentWindow as any).addSlide(slide.html)
        } else {
          contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
        }
      } catch {
        contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
      }
      injectedSlideIds.current.add(slide.id)
    })
  }

  // ─── Handle Iframe Load ──────────────────────────────────────────────────
  const handleLoad = () => {
    setIsLoaded(true)
  }

  // ─── Watch loaded state and activeTheme ────────────────────────────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    // 1. Inject Theme Design CSS Tokens
    try {
      if ((contentWindow as any).setTheme) {
        ;(contentWindow as any).setTheme(activeTheme.cssTokens)
      } else {
        contentWindow.postMessage({ type: 'SET_THEME', cssTokens: activeTheme.cssTokens }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'SET_THEME', cssTokens: activeTheme.cssTokens }, '*')
    }

    // 2. Inject Built-in Reveal.js Base Theme if defined
    if (activeTheme.revealTheme) {
      contentWindow.postMessage(
        { type: 'SET_REVEAL_THEME', themeName: activeTheme.revealTheme },
        '*'
      )
    }

    // 3. Reset and perform a full slide re-injection
    reinjectAllSlides()
  }, [isLoaded, activeTheme])

  // ─── Watch slides array to handle incremental live injection ───────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    let newlyAdded = false

    // Identify and incrementally append any new slides
    slides.forEach((slide) => {
      if (!injectedSlideIds.current.has(slide.id)) {
        try {
          if ((contentWindow as any).addSlide) {
            ;(contentWindow as any).addSlide(slide.html)
          } else {
            contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
          }
        } catch {
          contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
        }
        injectedSlideIds.current.add(slide.id)
        newlyAdded = true
      }
    })

    // If the presentation slides array shrunk (e.g., reset, re-run, or deletion),
    // perform a full slide reload to regain DOM sync.
    if (!newlyAdded && injectedSlideIds.current.size > slides.length) {
      reinjectAllSlides()
    }
  }, [slides, isLoaded])

  return (
    <div
      className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border transition-all duration-500 no-drag"
      style={{
        boxShadow: `0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px -12px ${activeTheme?.colors?.accent || '#b57bff'}20`,
        borderColor: `${activeTheme?.colors?.accent || '#b57bff'}15`,
        backgroundColor: '#0d0d0d'
      }}
    >
      {/* Self-contained Reveal.js Preview Window */}
      <iframe
        ref={iframeRef}
        src="/reveal-host.html"
        onLoad={handleLoad}
        className="w-full h-full border-none outline-none bg-transparent"
        title="Live Slide Preview"
      />

      {/* Premium Loading Overlay (Corner Badge) */}
      {status.state === 'generating' && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3 px-4.5 py-2.5 rounded-full border bg-neutral-900/90 border-neutral-700 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-pulse">
          {/* Animated Spinner with harmony color */}
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: `${activeTheme.colors?.accent || '#a855f7'} transparent`
            }}
          />
          {/* Status Details */}
          <span className="text-xs font-semibold tracking-wide text-neutral-200">
            Generating slide {status.slidesGenerated} of {status.totalSlides}
          </span>
        </div>
      )}
    </div>
  )
}
export default SlidePreview
