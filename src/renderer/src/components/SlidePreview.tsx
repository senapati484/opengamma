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
  const injectedSlideIds = useRef<string[]>([])

  // ─── Direct DOM Injection Helper ───────────────────────────────────────────
  const reinjectAllSlides = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    try {
      if ((contentWindow as any).clearSlides) {
        ;(contentWindow as any).clearSlides()
      } else {
        contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
    }

    injectedSlideIds.current = []

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
      injectedSlideIds.current.push(slide.id)
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

    const currentInjected = injectedSlideIds.current
    let isPrefix = true
    if (currentInjected.length > slides.length) {
      isPrefix = false
    } else {
      for (let i = 0; i < currentInjected.length; i++) {
        if (currentInjected[i] !== slides[i].id) {
          isPrefix = false
          break
        }
      }
    }

    if (!isPrefix) {
      reinjectAllSlides()
    } else {
      for (let i = currentInjected.length; i < slides.length; i++) {
        const slide = slides[i]
        try {
          if ((contentWindow as any).addSlide) {
            ;(contentWindow as any).addSlide(slide.html)
          } else {
            contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
          }
        } catch {
          contentWindow.postMessage({ type: 'ADD_SLIDE', html: slide.html }, '*')
        }
        injectedSlideIds.current.push(slide.id)
      }
    }
  }, [slides, isLoaded])

  return (
    <div
      className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border transition-all duration-500 no-drag"
      style={{
        boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px ${activeTheme?.colors?.accent || '#0047ff'}10`,
        borderColor: `${activeTheme?.colors?.accent || '#0047ff'}20`,
        backgroundColor: activeTheme?.colors?.bg || '#0d0d0d'
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

      {/* Generation Status Badge */}
      {status.state === 'generating' && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full border bg-white/95 border-neutral-200 text-neutral-700 shadow-lg backdrop-blur-sm transition-all duration-300">
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: `${activeTheme.colors?.accent || '#0047ff'} transparent`
            }}
          />
          <span className="text-xs font-semibold tracking-wide">
            Generating slide {status.slidesGenerated} of {status.totalSlides}
          </span>
        </div>
      )}
    </div>
  )
}
export default SlidePreview
