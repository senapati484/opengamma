import { useRef, useState, useEffect } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import { LeftPanel } from './components/LeftPanel'
import { HomeScreen } from './components/HomeScreen'
import { StatusBar } from './components/StatusBar'
import SlidePreview from './components/SlidePreview'
import SlideThumbnails from './components/SlideThumbnails'
import { ErrorBoundary } from './components/ErrorBoundary'
import SlideEditModal from './components/SlideEditModal'
import { SettingsPanel } from './components/SettingsPanel'
import { useStream } from './lib/useStream'
import { useElectron } from './lib/useElectron'
import { themes } from './lib/themes'
import type { Presentation, GenerationConfig, Slide, SlideStyle, Theme } from './types'
import { compileSlideHtml } from './lib/slideCompiler'
import { PdfEditorView } from './components/PdfEditorView'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { HelpModal } from './components/HelpModal'

function AppInner() {
  const electronAPI = useElectron()
  const {
    activeTheme,
    setActiveTheme,
    presentations,
    setPresentations,
    activePresentation,
    setActivePresentation,
    settings,
    platform
  } = useAppContext()
  const isMac = platform === 'darwin'

  const {
    slides: streamedSlides,
    status,
    generate,
    cancel,
    reset: resetStream,
    regeneratingIndex,
    regenerateSlide
  } = useStream()

  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [currentView, setCurrentView] = useState<'home' | 'editor' | 'export-studio'>('home')
  const [isPresenting, setIsPresenting] = useState(false)
  const [voiceoverProgress, setVoiceoverProgress] = useState<{
    state: 'generating' | 'done' | 'error'
    current: number
    total: number
    error?: string
  } | null>(null)
  const [audioMap, setAudioMap] = useState<Record<number, string>>({})

  // Sync voiceovers and reset progress state when presentation changes
  useEffect(() => {
    if (activePresentation) {
      const map: Record<number, string> = {}
      activePresentation.slides.forEach((slide) => {
        if (slide.voiceoverUrl) {
          map[slide.index] = slide.voiceoverUrl
        }
      })
      setAudioMap(map)
    } else {
      setAudioMap({})
    }
    setVoiceoverProgress(null)
  }, [activePresentation])

  // Listen to IPC events for local voiceover progress and maps
  useEffect(() => {
    const unsubProgress = electronAPI.onVoiceoverProgress((progress) => {
      setVoiceoverProgress(progress)
    })

    const unsubAudioMap = electronAPI.onAudioMapReady((map) => {
      setAudioMap(map)
    })

    return () => {
      unsubProgress()
      unsubAudioMap()
    }
  }, [electronAPI])

  const handleGenerateVoiceovers = async () => {
    const pres = activePresentation
    if (!pres) return
    try {
      setVoiceoverProgress({
        state: 'generating',
        current: 0,
        total: pres.slides.length
      })
      const res = await electronAPI.generateVoiceovers(pres)
      if (res && res.success && res.presentation) {
        const generatedPres = res.presentation
        setActivePresentation(generatedPres)
        setPresentations((prev) => prev.map((p) => (p.id === generatedPres.id ? generatedPres : p)))
      }
    } catch (err: any) {
      console.error('[App] Failed to generate voiceovers:', err)
      setVoiceoverProgress({
        state: 'error',
        current: 0,
        total: pres.slides.length,
        error: err.message || String(err)
      })
    }
  }

  const displayedSlides = activePresentation ? activePresentation.slides : streamedSlides

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onExport: () => {
      if (activePresentation) {
        handleExport(activePresentation)
      }
    },
    onOpenSettings: () => {
      setShowSettings(true)
    },
    onEscape: () => {
      if (isPresenting) {
        setIsPresenting(false)
      } else if (
        status.state === 'generating' ||
        status.state === 'researching' ||
        status.state === 'imaging'
      ) {
        cancel()
      } else if (editingSlide) {
        setEditingSlide(null)
      } else if (showSettings) {
        setShowSettings(false)
      } else if (showHelp) {
        setShowHelp(false)
      }
    },
    onPrevSlide: () => {
      if ((currentView === 'editor' || isPresenting) && activeSlideIndex > 0) {
        setActiveSlideIndex((prev) => prev - 1)
      }
    },
    onNextSlide: () => {
      if (
        (currentView === 'editor' || isPresenting) &&
        activeSlideIndex < displayedSlides.length - 1
      ) {
        setActiveSlideIndex((prev) => prev + 1)
      }
    }
  })

  // Effect: Auto-save streamed presentation when generation finishes
  const hasSavedRef = useRef(false)
  const currentConfigRef = useRef<GenerationConfig | null>(null)
  const [currentConfig, setCurrentConfig] = useState<GenerationConfig | null>(null)

  useEffect(() => {
    if (status.state === 'done' && streamedSlides.length > 0 && !hasSavedRef.current) {
      hasSavedRef.current = true
      const deckSlides = streamedSlides
        .map((s) => s.deckSlide)
        .filter(Boolean)

      const deck =
        deckSlides.length > 0
          ? {
              schemaVersion: 1,
              meta: {
                title: streamedSlides[0]?.title || 'Untitled Presentation',
                author: 'OpenGamma',
                lang: 'en'
              },
              themeId: activeTheme?.id || 'startup-gradient',
              aspectRatio: currentConfigRef.current?.aspectRatio || '16:9',
              slides: deckSlides
            }
          : undefined

      const newPresentation: Presentation = {
        id: crypto.randomUUID(),
        prompt: currentConfigRef.current?.prompt || '',
        theme: activeTheme?.id || 'startup-gradient',
        aspectRatio: currentConfigRef.current?.aspectRatio || '16:9',
        slides: streamedSlides,
        deck,
        createdAt: Date.now(),
        title: streamedSlides[0]?.title || 'Untitled Presentation',
        bgMusicUrl: status.bgMusicUrl
      }

      electronAPI.savePresentation(newPresentation).then(() => {
        setPresentations((prev) => [newPresentation, ...prev])
        setActivePresentation(newPresentation)

        // Automatically trigger voiceover generation if enabled in the prompt settings
        if (currentConfigRef.current?.generateVoiceover) {
          setVoiceoverProgress({
            state: 'generating',
            current: 0,
            total: newPresentation.slides.length
          })
          electronAPI
            .generateVoiceovers(newPresentation)
            .then((res) => {
              if (res && res.success && res.presentation) {
                const generatedPres = res.presentation
                setActivePresentation(generatedPres)
                setPresentations((prev) =>
                  prev.map((p) => (p.id === generatedPres.id ? generatedPres : p))
                )
              }
            })
            .catch((err: any) => {
              console.error('[App] Auto voiceover generation failed:', err)
            })
        }
      })
    }
  }, [status.state, status.bgMusicUrl, streamedSlides, activeTheme])

  // Effect: Sync active presentation with streamed slides during generation
  useEffect(() => {
    if (
      status.state === 'generating' ||
      status.state === 'researching' ||
      status.state === 'imaging'
    ) {
      setActivePresentation(null)
      setCurrentView('editor')
    }
  }, [status.state])

  // Ensure activeSlideIndex stays in bounds
  useEffect(() => {
    if (activeSlideIndex >= displayedSlides.length) {
      setActiveSlideIndex(Math.max(0, displayedSlides.length - 1))
    }
  }, [displayedSlides.length, activeSlideIndex])

  const handleSelectPresentation = async (id: string) => {
    try {
      const pres = await electronAPI.getPresentationById(id)
      if (pres) {
        setActivePresentation(pres)
        const themeId = pres.theme
        const matchedTheme = themes.find((t) => t.id === themeId)
        if (matchedTheme) {
          setActiveTheme(matchedTheme)
        }
        setActiveSlideIndex(0)
        setCurrentView('editor')
      }
    } catch (err) {
      console.error('[App] Failed to load presentation:', err)
    }
  }

  const handleDeletePresentation = async (id: string) => {
    try {
      await electronAPI.deletePresentation(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
      if (activePresentation?.id === id) {
        setActivePresentation(null)
        setCurrentView('home')
      }
    } catch (err) {
      console.error('[App] Failed to delete presentation:', err)
    }
  }

  const handleGenerate = (config: GenerationConfig) => {
    currentConfigRef.current = config
    setCurrentConfig(config)
    hasSavedRef.current = false
    setActiveSlideIndex(0)
    setActiveTheme(config.theme)
    setCurrentView('editor')
    generate(config)
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setActivePresentation(null)
    resetStream()
  }

  const handleSaveEditedSlide = async (
    title: string,
    bullets: string[],
    notes: string,
    layout: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote',
    style: SlideStyle
  ) => {
    if (!editingSlide || !activePresentation) return

    const updatedSlides = activePresentation.slides.map((s) => {
      if (s.id === editingSlide.id) {
        // Extract existing image HTML if any to preserve it
        let existingImageHtml: string | undefined = undefined
        const parser = new DOMParser()
        const doc = parser.parseFromString(s.html, 'text/html')
        const figure = doc.querySelector('figure.og-image-figure, figure.og-image-placeholder')
        if (figure) {
          existingImageHtml = figure.outerHTML
        }
        const compiledHtml = compileSlideHtml(
          title,
          bullets,
          notes,
          layout,
          style,
          s.id,
          existingImageHtml
        )
        return {
          ...s,
          title,
          bullets,
          notes,
          slideType: layout,
          style,
          html: compiledHtml
        }
      }
      return s
    })

    const updatedPres = { ...activePresentation, slides: updatedSlides }
    try {
      await electronAPI.savePresentation(updatedPres)
      setActivePresentation(updatedPres)
      setPresentations((prev) => prev.map((p) => (p.id === updatedPres.id ? updatedPres : p)))
      setEditingSlide(null)
    } catch (err) {
      console.error('[App] Failed to save edited slide:', err)
    }
  }

  const handleUpdateActiveSlideBullets = async (bullets: string[]) => {
    const activeSlide = displayedSlides[activeSlideIndex]
    if (!activeSlide || !activePresentation) return

    const updatedSlides = activePresentation.slides.map((s) => {
      if (s.id === activeSlide.id) {
        // Extract existing image HTML if any to preserve it
        let existingImageHtml: string | undefined = undefined
        const parser = new DOMParser()
        const doc = parser.parseFromString(s.html, 'text/html')
        const figure = doc.querySelector('figure.og-image-figure, figure.og-image-placeholder')
        if (figure) {
          existingImageHtml = figure.outerHTML
        }
        const compiledHtml = compileSlideHtml(
          s.title,
          bullets,
          s.notes,
          s.slideType,
          s.style || {},
          s.id,
          existingImageHtml
        )
        return {
          ...s,
          bullets,
          html: compiledHtml
        }
      }
      return s
    })

    const updatedPres = { ...activePresentation, slides: updatedSlides }
    try {
      await electronAPI.savePresentation(updatedPres)
      setActivePresentation(updatedPres)
      setPresentations((prev) => prev.map((p) => (p.id === updatedPres.id ? updatedPres : p)))
    } catch (err) {
      console.error('[App] Failed to update active slide bullets:', err)
    }
  }

  const handleUpdatePresentationTheme = async (theme: Theme) => {
    setActiveTheme(theme)
    if (!activePresentation) return
    const updatedPres = { ...activePresentation, theme: theme.id }
    try {
      await electronAPI.savePresentation(updatedPres)
      setActivePresentation(updatedPres)
      setPresentations((prev) => prev.map((p) => (p.id === updatedPres.id ? updatedPres : p)))
    } catch (err) {
      console.error('[App] Failed to update presentation theme:', err)
    }
  }

  const handleExport = (pres: Presentation) => {
    setActivePresentation(pres)
    const themeId = pres.theme
    const matchedTheme = themes.find((t) => t.id === themeId)
    if (matchedTheme) {
      setActiveTheme(matchedTheme)
    }
    setCurrentView('export-studio')
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0d0d] text-neutral-400 font-sans antialiased">
      {/* Custom Title Bar — macOS only (Windows/Linux have a native titlebar) */}
      {isMac && (
        <div className="h-8 w-full flex-none flex items-center justify-center select-none drag-region border-b border-white/5 bg-[#141414]">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.25em]">
            OpenGamma
          </span>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Control Panel */}
        {currentView !== 'export-studio' && (
          <LeftPanel
            onGenerate={handleGenerate}
            isGenerating={
              status.state === 'generating' ||
              status.state === 'researching' ||
              status.state === 'imaging'
            }
            onCancel={cancel}
            settings={settings}
            onOpenSettings={() => setShowSettings(true)}
            onOpenHelp={() => setShowHelp(true)}
            onImport={() => {}}
            activeSlide={displayedSlides[activeSlideIndex] || null}
            onUpdateActiveSlideBullets={activePresentation ? handleUpdateActiveSlideBullets : null}
            activeTheme={activeTheme}
            onUpdateTheme={handleUpdatePresentationTheme}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] relative">
          {currentView === 'home' ? (
            <HomeScreen
              presentations={presentations}
              onOpen={handleSelectPresentation}
              onDelete={handleDeletePresentation}
              onExport={handleExport}
              onNew={() => {}}
              onSelectTemplate={(tpl) => {
                const matchedTheme = themes.find((t) => t.id === tpl.themeId) || themes[0]
                handleGenerate({
                  prompt: `Title: ${tpl.title}\n\n${tpl.prompt}`,
                  theme: matchedTheme,
                  narrative: tpl.narrative,
                  slideCount: 8,
                  aspectRatio: '16:9',
                  generateImages: true,
                  generateVoiceover: false,
                  generateBgMusic: false
                })
              }}
            />
          ) : currentView === 'export-studio' ? (
            activePresentation && (
              <PdfEditorView
                presentation={activePresentation}
                activeTheme={activeTheme || themes[0]}
                onBack={() => setCurrentView('editor')}
              />
            )
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="h-[54px] px-6 border-b border-white/10 bg-[#121212]/80 backdrop-blur-md flex items-center justify-between z-20 flex-none select-none">
                <button
                  onClick={handleBackToHome}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-xs font-semibold transition-all active:scale-95 group"
                  title="Back to library (Esc)"
                >
                  <svg
                    className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Library</span>
                  <span className="text-[10px] text-neutral-500 font-mono bg-white/5 px-1.5 py-0.2 rounded">
                    Esc
                  </span>
                </button>

                <div className="flex flex-col items-center max-w-[50%] min-w-0 px-4">
                  <div
                    className="text-xs font-bold text-white tracking-wide truncate max-w-full"
                    title={
                      activePresentation?.title ||
                      currentConfig?.prompt?.split('\n')[0] ||
                      'Generating Presentation...'
                    }
                  >
                    {activePresentation?.title ||
                      currentConfig?.prompt?.split('\n')[0] ||
                      'Generating Presentation...'}
                  </div>
                  {status.state === 'researching' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-semibold text-cyan-400 mt-0.5">
                      <div className="w-2 h-2 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                      <span>Researching topic & outline...</span>
                    </div>
                  )}
                  {status.state === 'generating' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#e8ff57]/10 border border-[#e8ff57]/20 text-[10px] font-semibold text-[#e8ff57] mt-0.5">
                      <div className="w-2 h-2 rounded-full border border-[#e8ff57] border-t-transparent animate-spin" />
                      <span>
                        Drafting slide {status.slidesGenerated} of {status.totalSlides}
                      </span>
                    </div>
                  )}
                  {status.state === 'imaging' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-semibold text-purple-400 mt-0.5">
                      <div className="w-2 h-2 rounded-full border border-purple-400 border-t-transparent animate-spin" />
                      <span>
                        Generating visuals {status.imagesGenerated ?? 0}/{status.totalImages ?? '...'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {voiceoverProgress ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300">
                      {voiceoverProgress.state === 'generating' && (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-[#e8ff57]" />
                          <span>
                            Voiceovers {voiceoverProgress.current}/{voiceoverProgress.total}...
                          </span>
                        </>
                      )}
                      {voiceoverProgress.state === 'done' && (
                        <span className="text-[#e8ff57] font-semibold flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                          Audio Ready
                        </span>
                      )}
                      {voiceoverProgress.state === 'error' && (
                        <span
                          className="text-red-400 font-semibold flex items-center gap-1.5"
                          title={voiceoverProgress.error}
                        >
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Audio Error</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled={
                        !activePresentation ||
                        status.state === 'generating' ||
                        status.state === 'researching'
                      }
                      onClick={handleGenerateVoiceovers}
                      className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-25 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                      title="Generate audio narration with speech synthesis"
                    >
                      <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Voiceover</span>
                    </button>
                  )}

                  <button
                    disabled={!activePresentation}
                    onClick={() => setIsPresenting(true)}
                    className="h-8 px-3.5 rounded-lg bg-[#e8ff57] hover:brightness-105 active:scale-95 disabled:opacity-25 text-black font-black text-xs transition-all shadow-md shadow-[#e8ff57]/10 flex items-center gap-1.5"
                    title="Fullscreen presentation mode"
                  >
                    <svg className="w-3.5 h-3.5 fill-black" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Present</span>
                  </button>

                  <button
                    disabled={!activePresentation}
                    onClick={() => activePresentation && handleExport(activePresentation)}
                    className="h-8 px-3.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-25 border border-white/10 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-sm"
                    title="Open Export Studio (PDF, PPTX, HTML)"
                  >
                    <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Slide Canvas */}
              <div className="flex-1 p-4 md:p-6 lg:p-8 min-h-0 flex items-center justify-center">
                <ErrorBoundary>
                  {!isPresenting && (
                    <SlidePreview
                      slides={displayedSlides}
                      activeTheme={activeTheme || themes[0]}
                      status={status}
                      aspectRatio={
                        activePresentation?.aspectRatio ||
                        currentConfig?.aspectRatio ||
                        '16:9'
                      }
                      activeSlideIndex={activeSlideIndex}
                      onActiveSlideChange={setActiveSlideIndex}
                      bgMusicUrl={
                        activePresentation ? activePresentation.bgMusicUrl : status.bgMusicUrl
                      }
                      audioMap={audioMap}
                    />
                  )}
                </ErrorBoundary>
              </div>

              {/* Slide Strip */}
              <div className="h-[140px] flex-none px-8 pb-6">
                <SlideThumbnails
                  slides={displayedSlides}
                  activeSlideIndex={activeSlideIndex}
                  activeTheme={activeTheme || themes[0]}
                  onSelectSlide={setActiveSlideIndex}
                  onEditSlide={(idx) => setEditingSlide(displayedSlides[idx])}
                  onRegenerateSlide={regenerateSlide}
                  regeneratingIndex={regeneratingIndex}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar />

      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <SlideEditModal
        slide={editingSlide}
        activeTheme={activeTheme || themes[0]}
        isOpen={editingSlide !== null}
        onSave={handleSaveEditedSlide}
        onClose={() => setEditingSlide(null)}
      />

      {/* Fullscreen Present Mode Overlay */}
      {isPresenting && activePresentation && (
        <div className="fixed inset-0 z-[100] bg-[#0d0d0d] flex flex-col justify-between p-6 select-none animate-fade-in">
          {/* Header controls */}
          <div className="h-10 w-full flex items-center justify-between px-4 z-50 text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Presenting: {activePresentation.title}
            </span>
            <button
              onClick={() => setIsPresenting(false)}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all uppercase tracking-widest"
            >
              Exit Presentation (ESC)
            </button>
          </div>

          {/* Large Slide Canvas */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
            <SlidePreview
              slides={activePresentation.slides}
              activeTheme={activeTheme || themes[0]}
              status={status}
              aspectRatio={activePresentation.aspectRatio || '16:9'}
              activeSlideIndex={activeSlideIndex}
              onActiveSlideChange={setActiveSlideIndex}
              bgMusicUrl={activePresentation.bgMusicUrl}
              audioMap={audioMap}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
