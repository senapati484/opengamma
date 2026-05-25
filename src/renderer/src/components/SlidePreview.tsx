import React, { useRef, useEffect, useState } from 'react'
import type { Slide, Theme, StreamStatus } from '../types'
import { GLOBAL_LAYOUT_CSS } from '../lib/layoutStyles'


export interface SlidePreviewProps {
  /** The current array of presentation slides */
  slides: Slide[]
  /** The currently selected design theme and colors */
  activeTheme: Theme
  /** Stream status reflecting the current Claude generation lifecycle state */
  status: StreamStatus
  /** Selected aspect ratio */
  aspectRatio?: '9:16' | '16:9' | '1:1'
  /** The active slide index for synchronization */
  activeSlideIndex?: number
  /** Callback triggered when the active slide changes inside the preview */
  onActiveSlideChange?: (index: number) => void
  /** Base64 MP3 ambient loop background music URL */
  bgMusicUrl?: string
  /** Audio URL mapping (e.g. { 0: 'og-audio://...' }) */
  audioMap?: Record<number, string>
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slides,
  activeTheme,
  status,
  aspectRatio = '16:9',
  activeSlideIndex,
  onActiveSlideChange,
  bgMusicUrl: _bgMusicUrl,
  audioMap
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const injectedSlideIds = useRef<string[]>([])

  // ─── Audio Playback State & Refs ───────────────────────────────────────────
  // NOTE: Voiceover audio is handled ENTIRELY inside the reveal-host.html iframe.
  // This component only manages:
  //   - isPlaying: UI state for the play/pause button
  //   - bgMusicAudioRef: the looping ambient background track (kept in React)
  //   - autoAdvance / mute settings forwarded via postMessage
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [isVoiceoverMuted, setIsVoiceoverMuted] = useState(false)
  const [voiceoverVolume, _setVoiceoverVolume] = useState(1.0)



  // Sync audioMap to Reveal iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    contentWindow.postMessage({ type: 'SET_AUDIO_MAP', audioMap }, '*')
  }, [isLoaded, audioMap])

  // Sync autoAdvance to Reveal iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    contentWindow.postMessage({ type: 'SET_AUTO_ADVANCE', autoAdvance }, '*')
  }, [isLoaded, autoAdvance])

  // Forward voiceover mute/volume changes into the iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return
    contentWindow.postMessage(
      { type: 'SET_VOICEOVER_SETTINGS', muted: isVoiceoverMuted, volume: voiceoverVolume },
      '*'
    )
  }, [isLoaded, isVoiceoverMuted, voiceoverVolume])

  // When audioMap updates while already playing, restart playback from current slide
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !isLoaded) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow) return
    // First push the new map to the iframe
    contentWindow.postMessage({ type: 'SET_AUDIO_MAP', audioMap }, '*')
    // If we're in play mode, restart from current slide
    if (isPlaying && audioMap && Object.keys(audioMap).length > 0) {
      contentWindow.postMessage({ type: 'PLAY_PRESENTATION' }, '*')
    }
  }, [audioMap, isLoaded])

  const togglePlayPause = () => {
    const nextPlaying = !isPlaying
    setIsPlaying(nextPlaying)
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow && isLoaded) {
      // Use explicit PLAY/PAUSE messages for clarity
      iframe.contentWindow.postMessage(
        { type: nextPlaying ? 'PLAY_PRESENTATION' : 'PAUSE_PRESENTATION' },
        '*'
      )
    }
  }

  const handleSkip = () => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow && isLoaded) {
      iframe.contentWindow.postMessage({ type: 'NEXT_SLIDE' }, '*')
    }
  }

  const hasVoiceover =
    slides.some((s) => s.voiceoverUrl) || (audioMap && Object.keys(audioMap).length > 0)
  const hasAudio = hasVoiceover

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

    if (typeof activeSlideIndex === 'number') {
      contentWindow.postMessage({ type: 'GO_TO_SLIDE', index: activeSlideIndex }, '*')
    }
  }

  // ─── Handle Iframe Load ──────────────────────────────────────────────────
  const handleLoad = () => {
    setIsLoaded(true)
    if (iframeRef.current) {
      iframeRef.current.focus()
    }
  }

  // Focus the iframe on load to receive keyboard events
  useEffect(() => {
    if (isLoaded && iframeRef.current) {
      iframeRef.current.focus()
    }
  }, [isLoaded])

  // ─── Watch aspect ratio changes ──────────────────────────────────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    contentWindow.postMessage({ type: 'SET_ASPECT_RATIO', aspectRatio }, '*')
  }, [isLoaded, aspectRatio])

  // ─── Watch activeSlideIndex changes ──────────────────────────────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return
    if (typeof activeSlideIndex === 'number') {
      contentWindow.postMessage({ type: 'GO_TO_SLIDE', index: activeSlideIndex }, '*')
    }
  }, [isLoaded, activeSlideIndex])

  // ─── Listen for SLIDE_CHANGED and AUDIO events from iframe ────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our own iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return
      }

      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'SLIDE_CHANGED' && typeof data.index === 'number') {
        if (data.index !== activeSlideIndex && onActiveSlideChange) {
          onActiveSlideChange(data.index)
        }
      } else if (data.type === 'AUDIO_PLAYING') {
        setIsPlaying(true)
      } else if (data.type === 'AUDIO_PAUSED' || data.type === 'AUDIO_ENDED') {
        setIsPlaying(false)
      } else if (data.type === 'IFRAME_KEY_DOWN') {
        // Forward iframe key events to the parent window
        const eventInit = {
          key: data.key,
          code: data.code,
          ctrlKey: data.ctrlKey,
          metaKey: data.metaKey,
          shiftKey: data.shiftKey,
          altKey: data.altKey,
          bubbles: true
        }
        window.dispatchEvent(new KeyboardEvent('keydown', eventInit))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [activeSlideIndex, onActiveSlideChange])

  // ─── Watch loaded state and activeTheme ────────────────────────────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow || !isLoaded) return

    // 1. Inject Theme Design CSS Tokens with Global Layout Overrides (Cache Inoculation)
    const cssWithLayout = `${activeTheme.cssTokens}\n${GLOBAL_LAYOUT_CSS}`
    try {
      if ((contentWindow as any).setTheme) {
        ;(contentWindow as any).setTheme(cssWithLayout)
      } else {
        contentWindow.postMessage({ type: 'SET_THEME', cssTokens: cssWithLayout }, '*')
      }
    } catch {
      contentWindow.postMessage({ type: 'SET_THEME', cssTokens: cssWithLayout }, '*')
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

      if (typeof activeSlideIndex === 'number') {
        contentWindow.postMessage({ type: 'GO_TO_SLIDE', index: activeSlideIndex }, '*')
      }
    }
  }, [slides, isLoaded, activeSlideIndex])

  // Resolve standard css aspect ratio fraction
  const cssAspectRatio = aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9'

  return (
    <div
      className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border transition-all duration-500 no-drag flex items-center justify-center"
      style={{
        boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px ${activeTheme?.colors?.accent || '#0047ff'}10`,
        borderColor: `${activeTheme?.colors?.accent || '#0047ff'}20`,
        backgroundColor: activeTheme?.colors?.bg || '#0d0d0d'
      }}
    >
      {/* Self-contained Reveal.js Preview Window */}
      <iframe
        ref={iframeRef}
        src="./reveal-host.html"
        onLoad={handleLoad}
        style={{
          aspectRatio: cssAspectRatio,
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        className="border-none outline-none bg-transparent transition-all duration-500"
        title="Live Slide Preview"
      />

      {/* Generation Status Badge */}
      {(status.state === 'generating' || status.state === 'researching') && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full border bg-white/95 border-neutral-200 text-neutral-700 shadow-lg backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: `${activeTheme.colors?.accent || '#0047ff'} transparent`
            }}
          />
          <span className="text-xs font-semibold tracking-wide">
            {status.state === 'researching'
              ? 'Analyzing topic & researching content...'
              : `Generating slide ${status.slidesGenerated} of ${status.totalSlides}`}
          </span>
        </div>
      )}

      {/* Floating Audio Playback Control Bar */}
      {hasAudio && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/70 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3.5 shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:border-white/20 hover:bg-black/80 transition-all select-none animate-fade-in">
          {/* Main Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-[#e8ff57] hover:scale-105 active:scale-95 flex items-center justify-center text-black transition-all"
            title={isPlaying ? 'Pause Presentation Audio' : 'Play Presentation Audio'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip Button */}
          {hasVoiceover && (
            <button
              onClick={handleSkip}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all"
              title="Skip to Next Slide"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 5v14l11-7zm12 0v14h3V5z" />
              </svg>
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />

          {/* Auto-Advance Toggle */}
          {hasVoiceover && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoAdvance(!autoAdvance)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    autoAdvance
                      ? 'text-[#e8ff57] hover:text-[#f3ff99]'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                  title={autoAdvance ? 'Disable Slide Auto-Advance' : 'Enable Slide Auto-Advance'}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.547 9.547 4.5 10.768 4.5 12s.047 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z"
                    />
                  </svg>
                </button>
                <span className="text-[10px] font-bold text-neutral-400">Auto-Play</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
            </>
          )}

          {/* Voiceover Toggle Button */}
          {hasVoiceover && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVoiceoverMuted(!isVoiceoverMuted)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isVoiceoverMuted
                    ? 'text-neutral-500 hover:text-neutral-300'
                    : 'text-[#e8ff57] hover:text-[#f3ff99]'
                }`}
                title={isVoiceoverMuted ? 'Unmute AI Voiceover' : 'Mute AI Voiceover'}
              >
                {isVoiceoverMuted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-bold text-neutral-400">Voiceover</span>
            </div>
          )}

          {/* Background Music Controls hidden */}
        </div>
      )}
    </div>
  )
}
export default SlidePreview
