import React, { useRef, useEffect, useState } from 'react'
import type { Slide, Theme, StreamStatus } from '../types'

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
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slides,
  activeTheme,
  status,
  aspectRatio = '16:9',
  activeSlideIndex,
  onActiveSlideChange,
  bgMusicUrl
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const injectedSlideIds = useRef<string[]>([])

  // ─── Audio Playback State & Refs ───────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(true)
  const [isVoiceoverMuted, setIsVoiceoverMuted] = useState(false)
  const [isBgMusicMuted, setIsBgMusicMuted] = useState(false)
  const [voiceoverVolume, _setVoiceoverVolume] = useState(1.0)
  const [bgMusicVolume, setBgMusicVolume] = useState(0.15)

  const voiceoverAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgMusicAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    voiceoverAudioRef.current = new Audio()
    bgMusicAudioRef.current = new Audio()
    bgMusicAudioRef.current.loop = true

    return () => {
      voiceoverAudioRef.current?.pause()
      bgMusicAudioRef.current?.pause()
    }
  }, [])

  // Sync background music src & playback
  useEffect(() => {
    const bgAudio = bgMusicAudioRef.current
    if (!bgAudio) return

    if (bgMusicUrl) {
      bgAudio.src = bgMusicUrl
      bgAudio.load()
      if (isPlaying && !isBgMusicMuted) {
        bgAudio.play().catch((err) => console.log('[SlidePreview] BG music autoplay blocked:', err))
      }
    } else {
      bgAudio.pause()
    }
  }, [bgMusicUrl])

  // Sync voiceover when active slide changes or slide gets voiceover URL
  useEffect(() => {
    const voiceoverAudio = voiceoverAudioRef.current
    if (!voiceoverAudio) return

    const activeSlide = slides[activeSlideIndex ?? 0]
    if (activeSlide?.voiceoverUrl) {
      voiceoverAudio.pause()
      voiceoverAudio.src = activeSlide.voiceoverUrl
      voiceoverAudio.load()
      if (isPlaying && !isVoiceoverMuted) {
        voiceoverAudio.play().catch((err) => console.log('[SlidePreview] Voiceover autoplay blocked:', err))
      }
    } else {
      voiceoverAudio.pause()
    }
  }, [activeSlideIndex, slides])

  // React to mute/volume changes for background music
  useEffect(() => {
    const bgAudio = bgMusicAudioRef.current
    if (!bgAudio) return
    bgAudio.volume = isBgMusicMuted ? 0 : bgMusicVolume
    if (isPlaying && bgMusicUrl && !isBgMusicMuted) {
      bgAudio.play().catch(() => {})
    } else {
      bgAudio.pause()
    }
  }, [isBgMusicMuted, bgMusicVolume, isPlaying, bgMusicUrl])

  // React to mute/volume changes for voiceover
  useEffect(() => {
    const voiceoverAudio = voiceoverAudioRef.current
    if (!voiceoverAudio) return
    voiceoverAudio.volume = isVoiceoverMuted ? 0 : voiceoverVolume
    if (isPlaying && !isVoiceoverMuted) {
      if (voiceoverAudio.paused && voiceoverAudio.src) {
        voiceoverAudio.play().catch(() => {})
      }
    } else {
      voiceoverAudio.pause()
    }
  }, [isVoiceoverMuted, voiceoverVolume, isPlaying])

  const hasVoiceover = slides.some((s) => s.voiceoverUrl)
  const hasAudio = !!bgMusicUrl || hasVoiceover

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
  }

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

  // ─── Listen for SLIDE_CHANGED events from iframe ───────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'SLIDE_CHANGED' && typeof data.index === 'number') {
        if (data.index !== activeSlideIndex && onActiveSlideChange) {
          onActiveSlideChange(data.index)
        }
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
        src="/reveal-host.html"
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
            onClick={() => setIsPlaying(!isPlaying)}
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

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />

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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-bold text-neutral-400">Voiceover</span>
            </div>
          )}

          {/* Background Music Controls */}
          {bgMusicUrl && (
            <>
              {hasVoiceover && <div className="w-px h-5 bg-white/10" />}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBgMusicMuted(!isBgMusicMuted)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isBgMusicMuted
                      ? 'text-neutral-500 hover:text-neutral-300'
                      : 'text-[#e8ff57] hover:text-[#f3ff99]'
                  }`}
                  title={isBgMusicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
                >
                  {isBgMusicMuted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 10l12-3M9 21a3 3 0 11-6-0 3 3 0 016 0zm12-4a3 3 0 11-6-0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                
                <span className="text-[10px] font-bold text-neutral-400">Ambient</span>
                
                {/* Micro Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={bgMusicVolume}
                  onChange={(e) => {
                    setBgMusicVolume(parseFloat(e.target.value))
                    if (isBgMusicMuted && parseFloat(e.target.value) > 0) {
                      setIsBgMusicMuted(false)
                    }
                  }}
                  className="w-12 h-1 bg-[#333] rounded-full appearance-none accent-[#e8ff57] cursor-pointer outline-none transition-all hover:w-16"
                  title="Ambient Music Volume"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
export default SlidePreview
