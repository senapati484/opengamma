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
import type { Presentation, GenerationConfig, Slide, SlideStyle } from './types'
import { compileSlideHtml } from './lib/slideCompiler'
import { PdfEditorView } from './components/PdfEditorView'

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
  const [currentView, setCurrentView] = useState<'home' | 'editor' | 'export-studio'>('home')

  // Effect: Auto-save streamed presentation when generation finishes
  const hasSavedRef = useRef(false)
  const currentConfigRef = useRef<GenerationConfig | null>(null)

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
        title: streamedSlides[0]?.title || 'Untitled Presentation'
      }

      electronAPI.savePresentation(newPresentation).then(() => {
        setPresentations((prev) => [newPresentation, ...prev])
        setActivePresentation(newPresentation)
      })
    }
  }, [status.state, streamedSlides, activeTheme])

  // Effect: Sync active presentation with streamed slides during generation
  useEffect(() => {
    if (status.state === 'generating' || status.state === 'researching') {
      setActivePresentation(null)
      setCurrentView('editor')
    }
  }, [status.state])

  const displayedSlides = activePresentation ? activePresentation.slides : streamedSlides

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
    layout: 'title' | 'content' | 'split' | 'data' | 'cta',
    style: SlideStyle
  ) => {
    if (!editingSlide || !activePresentation) return

    const updatedSlides = activePresentation.slides.map((s) => {
      if (s.id === editingSlide.id) {
        const compiledHtml = compileSlideHtml(title, bullets, notes, layout, style, s.id)
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
      setPresentations((prev) =>
        prev.map((p) => (p.id === updatedPres.id ? updatedPres : p))
      )
      setEditingSlide(null)
    } catch (err) {
      console.error('[App] Failed to save edited slide:', err)
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
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.3em]">OpenGamma</span>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Control Panel */}
        {currentView !== 'export-studio' && (
          <LeftPanel 
            onGenerate={handleGenerate}
            isGenerating={status.state === 'generating' || status.state === 'researching'}
            onCancel={cancel}
            settings={settings}
            onOpenSettings={() => setShowSettings(true)}
            onOpenHelp={() => {}}
            onImport={() => {}}
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
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="flex flex-col items-center">
                   <div className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[300px]">
                     {activePresentation?.title || currentConfigRef.current?.prompt?.split('\n')[0] || 'Generating Presentation...'}
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
                </div>

                <div className="flex items-center gap-2">
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
                  <SlidePreview 
                    slides={displayedSlides}
                    activeTheme={activeTheme || themes[0]}
                    status={status}
                    aspectRatio={activePresentation?.aspectRatio || currentConfigRef.current?.aspectRatio || '16:9'}
                    activeSlideIndex={activeSlideIndex}
                    onActiveSlideChange={setActiveSlideIndex}
                  />
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
      
      <SlideEditModal 
        slide={editingSlide}
        activeTheme={activeTheme || themes[0]}
        isOpen={editingSlide !== null}
        onSave={handleSaveEditedSlide}
        onClose={() => setEditingSlide(null)}
      />
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
