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
    settings
  } = useAppContext()

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
      const newPresentation: Presentation = {
        id: crypto.randomUUID(),
        prompt: currentConfigRef.current?.prompt || '',
        theme: activeTheme?.id || 'startup-gradient',
        aspectRatio: currentConfigRef.current?.aspectRatio || '16:9',
        slides: streamedSlides,
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
      {/* Custom Title Bar */}
      <div className="h-8 w-full flex-none flex items-center justify-center select-none drag-region border-b border-white/5 bg-[#141414]">
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.3em]">
          Open Gamma
        </span>
      </div>

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
              <div className="h-[52px] px-6 border-b border-white/5 flex items-center justify-between">
                <button
                  onClick={handleBackToHome}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white transition-all uppercase tracking-widest"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                  Back
                </button>

                <div className="flex flex-col items-center">
                  <div className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[300px]">
                    {activePresentation?.title ||
                      currentConfig?.prompt?.split('\n')[0] ||
                      'Generating Presentation...'}
                  </div>
                  {status.state === 'researching' && (
                    <div className="text-[9px] font-bold text-[#57e8ff] uppercase tracking-widest animate-pulse">
                      Researching & outlining concepts...
                    </div>
                  )}
                  {status.state === 'generating' && (
                    <div className="text-[9px] font-bold text-[#e8ff57] uppercase tracking-widest animate-pulse">
                      Writing slide {status.slidesGenerated} of {status.totalSlides}
                    </div>
                  )}
                  {status.state === 'imaging' && (
                    <div className="text-[9px] font-bold text-[#a78bfa] uppercase tracking-widest animate-pulse">
                      Generating images {status.imagesGenerated ?? 0}/{status.totalImages ?? '...'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {voiceoverProgress ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-400">
                      {voiceoverProgress.state === 'generating' && (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-[#e8ff57]" />
                          <span>
                            Generating Voiceover {voiceoverProgress.current}/
                            {voiceoverProgress.total}...
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
                          Voiceovers Ready
                        </span>
                      )}
                      {voiceoverProgress.state === 'error' && (
                        <span
                          className="text-red-500 font-semibold flex items-center gap-1"
                          title={voiceoverProgress.error}
                        >
                          ⚠ Error Generating
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
                      className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 active:scale-95 disabled:opacity-20 transition-all uppercase tracking-widest flex items-center gap-1.5"
                    >
                      🗣 Voiceover
                    </button>
                  )}
                  <button
                    disabled={!activePresentation}
                    onClick={() => setIsPresenting(true)}
                    className="px-4 py-1.5 rounded-lg bg-[#e8ff57] text-black hover:shadow-[0_0_15px_rgba(232,255,87,0.2)] active:scale-95 disabled:opacity-20 transition-all text-xs font-black uppercase tracking-widest animate-fade-in"
                  >
                    ▶ Present
                  </button>
                  <button
                    disabled={!activePresentation}
                    onClick={() => activePresentation && handleExport(activePresentation)}
                    className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-white hover:bg-white/10 active:scale-95 disabled:opacity-20 transition-all uppercase tracking-widest"
                  >
                    Export
                  </button>
                </div>
              </div>

              {/* Slide Canvas */}
              <div className="flex-1 p-8 min-h-0">
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
