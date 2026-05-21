import { useRef, useState, useEffect } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import Sidebar from './components/Sidebar'
import SlidePreview from './components/SlidePreview'
import { ErrorBoundary } from './components/ErrorBoundary'
import SlideEditModal from './components/SlideEditModal'
import { SettingsPanel } from './components/SettingsPanel'
import { UpdateBanner } from './components/UpdateBanner'
import { LayoutContainer } from './components/LayoutContainer'
import { PromptInputExpanded } from './components/PromptInputExpanded'
import { SidebarPanel } from './components/SidebarPanel'
import { RightPanel } from './components/RightPanel'
import { useStream } from './lib/useStream'
import { useElectron } from './lib/useElectron'
import { themes } from './lib/themes'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import type { Presentation, GenerationConfig, Theme, Slide } from './types'

/**
 * Reconstructs the slide HTML by parsing the old HTML using DOMParser
 * and updating the title, bullets, and speaker notes.
 * This preserves all styling classes and structural elements.
 */
function reconstructSlideHtml(
  oldHtml: string,
  title: string,
  bullets: string[],
  notes: string
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(oldHtml, 'text/html')

  // 1. Update title (first h1 or h2)
  const titleEl = doc.querySelector('h1, h2')
  if (titleEl) {
    titleEl.textContent = title
  } else {
    const section = doc.querySelector('section') || doc.body
    const h2 = doc.createElement('h2')
    h2.textContent = title
    section.insertBefore(h2, section.firstChild)
  }

  // 2. Update bullets (li items)
  if (bullets.length > 0) {
    const ul = doc.querySelector('ul')
    if (ul) {
      const existingLis = Array.from(ul.querySelectorAll('li'))

      bullets.forEach((bulletText, index) => {
        if (index < existingLis.length) {
          existingLis[index].textContent = bulletText
        } else {
          const li = doc.createElement('li')
          li.textContent = bulletText
          if (existingLis.length > 0) {
            li.className = existingLis[0].className
            li.style.cssText = existingLis[0].style.cssText
          }
          ul.appendChild(li)
        }
      })

      // Remove extra lis
      if (existingLis.length > bullets.length) {
        for (let i = bullets.length; i < existingLis.length; i++) {
          existingLis[i].remove()
        }
      }
    } else {
      const ul = doc.createElement('ul')
      bullets.forEach((bulletText) => {
        const li = doc.createElement('li')
        li.textContent = bulletText
        ul.appendChild(li)
      })

      const section = doc.querySelector('section') || doc.body
      section.appendChild(ul)
    }
  } else {
    const ul = doc.querySelector('ul')
    if (ul) {
      ul.remove()
    }
  }

  // 3. Update speaker notes
  const existingNotes = doc.querySelectorAll('aside.notes')
  existingNotes.forEach((n) => n.remove())

  if (notes && notes.trim()) {
    const section = doc.querySelector('section') || doc.body
    const aside = doc.createElement('aside')
    aside.className = 'notes'
    aside.textContent = notes.trim()
    section.appendChild(aside)
  }

  const section = doc.querySelector('section')
  return section ? section.outerHTML : doc.body.innerHTML
}

function AppInner() {
  const electronAPI = useElectron()
  const {
    activeTheme,
    setActiveTheme,
    presentations,
    setPresentations,
    activePresentation,
    setActivePresentation,
    selectedDesignSystem,
    setSelectedDesignSystem
  } = useAppContext()

  const {
    slides: streamedSlides,
    setSlides,
    status,
    generate,
    cancel,
    reset: resetStream,
    regeneratingIndex,
    regenerateSingleSlide
  } = useStream()

  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [undoPresentation, setUndoPresentation] = useState<Presentation | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [dashboardTab, setDashboardTab] = useState<'all' | 'recent' | 'yours'>('all')
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)

  const handleUndo = async () => {
    if (!undoPresentation) return
    try {
      await electronAPI.savePresentation(undoPresentation)
      setActivePresentation(undoPresentation)
      setPresentations((prev) =>
        prev.map((p) => (p.id === undoPresentation.id ? undoPresentation : p))
      )
      setUndoPresentation(null)
      showToast('Undo successful!', 'success')
    } catch (err) {
      console.error('[App] Failed to undo:', err)
      showToast('Undo failed', 'error')
    }
  }

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
    action?: { label: string; onClick: () => void }
  } | null>(null)

  const showToast = (
    message: string,
    type: 'success' | 'error',
    action?: { label: string; onClick: () => void }
  ) => {
    setToast({ message, type, action })
    setTimeout(() => setToast(null), 5000)
  }

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
        slides: streamedSlides,
        createdAt: Date.now(),
        title: streamedSlides[0]?.title || 'Untitled Presentation'
      }

      electronAPI.savePresentation(newPresentation).then(() => {
        setPresentations((prev) => [newPresentation, ...prev])
        setActivePresentation(newPresentation)
        showToast('Presentation generated and saved!', 'success')
      })
    }
  }, [status.state, streamedSlides, activeTheme])

  // Effect: Sync active presentation with streamed slides during generation
  useEffect(() => {
    if (status.state === 'generating') {
      setActivePresentation(null)
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
        setIsCreatingNew(false)
      } else {
        showToast('Presentation not found in database', 'error')
      }
    } catch (err) {
      console.error('[App] Failed to load presentation:', err)
      showToast('Failed to load presentation', 'error')
    }
  }

  const handleDeletePresentation = async (id: string) => {
    try {
      await electronAPI.deletePresentation(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
      if (activePresentation?.id === id) {
        setActivePresentation(null)
      }
      showToast('Presentation deleted', 'success')
    } catch (err) {
      console.error('[App] Failed to delete presentation:', err)
      showToast('Failed to delete presentation', 'error')
    }
  }

  const handleNewPresentation = () => {
    setActivePresentation(null)
    resetStream()
    setSlides([])
    hasSavedRef.current = false
    setActiveSlideIndex(0)
    setPromptValue('')
  }

  // Handle Start Generation Config
  const handleGenerate = () => {
    if (!activeTheme) return
    const config: GenerationConfig = {
      prompt: promptValue,
      theme: activeTheme,
      slideCount
    }
    currentConfigRef.current = config
    hasSavedRef.current = false
    setActiveSlideIndex(0)
    generate(config)
  }

  // Handle Theme Selection
  const handleThemeSelect = (theme: Theme) => {
    setActiveTheme(theme)
    if (activePresentation) {
      const updatedPres: Presentation = {
        ...activePresentation,
        theme: theme.id
      }
      setActivePresentation(updatedPres)
      setPresentations((prev) =>
        prev.map((p) => (p.id === activePresentation.id ? updatedPres : p))
      )
      electronAPI.savePresentation(updatedPres).catch((err) => {
        console.error('[App] Failed to update presentation theme:', err)
      })
    }
  }

  const handleSelectSlide = (index: number) => {
    setActiveSlideIndex(index)
  }

  const handleEditSlide = (slide: Slide) => {
    setEditingSlide(slide)
  }

  const handleRegenerateSlide = async (index: number) => {
    if (!activePresentation || status.state === 'generating') return
    setUndoPresentation(activePresentation)

    try {
      const updatedSlide = await regenerateSingleSlide(index, activePresentation)
      if (updatedSlide) {
        const updatedSlides = [...activePresentation.slides]
        updatedSlides[index] = updatedSlide
        const updatedPres = { ...activePresentation, slides: updatedSlides }
        setActivePresentation(updatedPres)
        setPresentations((prev) =>
          prev.map((p) => (p.id === activePresentation.id ? updatedPres : p))
        )
        await electronAPI.savePresentation(updatedPres)
        showToast('Slide regenerated!', 'success', { label: 'Undo', onClick: handleUndo })
      }
    } catch (err) {
      console.error('[App] Slide regeneration failed:', err)
      showToast('Slide regeneration failed', 'error')
    }
  }

  const handleSaveEditedSlide = async (title: string, bullets: string[], notes: string) => {
    if (!activePresentation || !editingSlide) return
    setUndoPresentation(activePresentation)

    const newHtml = reconstructSlideHtml(editingSlide.html, title, bullets, notes)
    const updatedSlide: Slide = {
      ...editingSlide,
      title,
      bullets,
      notes,
      html: newHtml
    }

    const updatedSlides = [...activePresentation.slides]
    const idx = updatedSlides.findIndex((s) => s.id === updatedSlide.id)
    if (idx !== -1) {
      updatedSlides[idx] = updatedSlide
      const updatedPres = { ...activePresentation, slides: updatedSlides }
      setActivePresentation(updatedPres)
      setPresentations((prev) =>
        prev.map((p) => (p.id === activePresentation.id ? updatedPres : p))
      )
      await electronAPI.savePresentation(updatedPres)
      setEditingSlide(null)
      showToast('Slide updated!', 'success', { label: 'Undo', onClick: handleUndo })
    }
  }

  const [isExportingPptx, setIsExportingPptx] = useState(false)
  const [isExportingHtml, setIsExportingHtml] = useState(false)

  const handleExport = async () => {
    if (!activePresentation) return
    setIsExportingPptx(true)
    try {
      const result = await electronAPI.exportPptx(activePresentation)
      if (result.success) {
        showToast(`Exported to: ${result.path}`, 'success')
      }
    } catch (err) {
      console.error('[App] Export error:', err)
      showToast('Export failed', 'error')
    } finally {
      setIsExportingPptx(false)
    }
  }

  const handleExportHtml = async () => {
    if (!activePresentation) return
    setIsExportingHtml(false)
    showToast('Exporting HTML...', 'success')
    try {
      const result = await (electronAPI as any).exportHtml?.(activePresentation)
      if (result?.success) {
        showToast(`HTML exported to: ${result.path}`, 'success')
      }
    } catch (err) {
      console.error('[App] HTML Export error:', err)
      showToast(err instanceof Error ? err.message : 'HTML Export failed', 'error')
    } finally {
      setIsExportingHtml(false)
    }
  }

  // Register global keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: () => {
      if (promptValue.trim() && status.state !== 'generating') {
        handleGenerate()
      }
    },
    onExport: handleExport,
    onSave: async () => {
      if (activePresentation) {
        try {
          await electronAPI.savePresentation(activePresentation)
          showToast('Presentation saved successfully!', 'success')
        } catch (err) {
          console.error('[App] Failed to save presentation:', err)
          showToast('Failed to save presentation', 'error')
        }
      }
    }
  })

  const goBackToDashboard = () => {
    setActivePresentation(null)
    setIsCreatingNew(false)
  }

  const isInEditorMode = activePresentation || isCreatingNew || status.state === 'generating'

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800 font-sans antialiased">
      <UpdateBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          presentations={presentations}
          activePresentationId={activePresentation?.id || null}
          onSelect={handleSelectPresentation}
          onDelete={handleDeletePresentation}
          onNewPresentation={handleNewPresentation}
          onGoToDashboard={goBackToDashboard}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          isHelpOpen={isHelpOpen}
          setIsHelpOpen={setIsHelpOpen}
        />

        {/* Main workspace column */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative overflow-hidden">

          {/* Titlebar / Drag region */}
          <div className="h-10 w-full flex-none flex items-center justify-between px-5 select-none drag-region border-b border-neutral-100">
            {isInEditorMode ? (
              <button
                onClick={goBackToDashboard}
                className="no-drag flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors px-2 py-1 rounded-md hover:bg-neutral-100"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Gammas
              </button>
            ) : (
              <span className="text-xs font-semibold text-neutral-400 select-none">OpenGamma</span>
            )}
            {activePresentation && isInEditorMode && (
              <span className="text-[10px] text-neutral-400 font-medium truncate max-w-xs no-drag pointer-events-none">
                {activePresentation.title}
              </span>
            )}
          </div>

          {!isInEditorMode ? (
            /* ─── DASHBOARD VIEW ─── */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-8 py-8">

                {/* Page header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Your Gammas</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">AI-powered presentations, ready to share</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                      title="Search presentations"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-3 mb-8">
                  <button
                    id="btn-generate-ai"
                    onClick={() => setIsCreatingNew(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0047ff] text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Generate with AI
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 active:scale-[0.98] transition-all border border-neutral-200 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import
                  </button>
                </div>

                {/* Navigation tabs */}
                <div className="flex items-center gap-1 mb-6 border-b border-neutral-100">
                  {(['all', 'recent', 'yours'] as const).map((tab) => {
                    const labels: Record<typeof tab, string> = {
                      all: 'All',
                      recent: 'Recently viewed',
                      yours: 'Created by you'
                    }
                    const isActive = dashboardTab === tab
                    return (
                      <button
                        key={tab}
                        onClick={() => setDashboardTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium transition-all relative -mb-px ${
                          isActive
                            ? 'text-[#0047ff] border-b-2 border-[#0047ff]'
                            : 'text-neutral-500 hover:text-neutral-800 rounded-t-lg'
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    )
                  })}
                </div>

                {/* Presentations grid */}
                {presentations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                      <svg className="w-9 h-9 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-neutral-800">No presentations yet</p>
                      <p className="text-sm text-neutral-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Generate your first AI-powered presentation in seconds
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreatingNew(true)}
                      className="px-6 py-3 rounded-xl bg-[#0047ff] text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200"
                    >
                      Generate with AI
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {presentations.map((pres) => {
                      const themeObj = themes.find((t) => t.id === pres.theme) || themes[0]
                      return (
                        <div
                          key={pres.id}
                          onClick={() => handleSelectPresentation(pres.id)}
                          className="group cursor-pointer flex flex-col rounded-2xl border border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 overflow-hidden"
                        >
                          {/* 16:9 cover thumbnail */}
                          <div
                            className="w-full aspect-video relative overflow-hidden flex items-center justify-center"
                            style={{ backgroundColor: themeObj.colors.bg }}
                          >
                            <div className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center">
                              <p
                                className="text-sm font-bold leading-tight line-clamp-2"
                                style={{ color: themeObj.colors.primary }}
                              >
                                {pres.title}
                              </p>
                              <div className="mt-2.5 flex flex-col gap-1 w-3/4">
                                <div
                                  className="h-[3px] rounded-full opacity-40"
                                  style={{ backgroundColor: themeObj.colors.text }}
                                />
                                <div
                                  className="h-[3px] rounded-full w-4/5 opacity-25"
                                  style={{ backgroundColor: themeObj.colors.text }}
                                />
                              </div>
                            </div>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/30">
                                Open →
                              </span>
                            </div>

                            {/* Slide count badge */}
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/40 text-white backdrop-blur-sm">
                              {pres.slides.length} slides
                            </span>
                          </div>

                          {/* Card footer */}
                          <div className="p-3.5 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-neutral-800 truncate">
                                {pres.title}
                              </p>
                              <p className="text-[11px] text-neutral-400 mt-0.5">
                                {new Date(pres.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePresentation(pres.id)
                              }}
                              className="flex-shrink-0 p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete presentation"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─── EDITOR VIEW ─── */
            <LayoutContainer
              titlebar={
                <div className="flex items-center justify-between px-5 w-full h-full">
                  <button
                    onClick={goBackToDashboard}
                    className="no-drag flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors px-2 py-1 rounded-md hover:bg-neutral-100"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to Gammas
                  </button>
                  {activePresentation && (
                    <span className="text-[10px] text-neutral-400 font-medium truncate max-w-xs no-drag pointer-events-none">
                      {activePresentation.title}
                    </span>
                  )}
                  <div className="flex-1" />
                </div>
              }
              sidebar={
                <SidebarPanel
                  slides={displayedSlides}
                  activeSlideIndex={activeSlideIndex}
                  onSelectSlide={handleSelectSlide}
                  onEditSlide={handleEditSlide}
                  onRegenerateSlide={handleRegenerateSlide}
                  activeTheme={activeTheme || themes[0]}
                  presentations={presentations}
                  activePresentationId={activePresentation?.id || null}
                  onSelectPresentation={handleSelectPresentation}
                  regeneratingIndex={regeneratingIndex}
                />
              }
              canvas={
                <>
                  {displayedSlides.length > 0 ? (
                    <ErrorBoundary>
                      <SlidePreview
                        slides={displayedSlides}
                        activeTheme={activeTheme || themes[0]}
                        status={status}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-neutral-400 text-sm">
                          {status.state === 'generating' ? 'Generating presentation...' : 'Generate a presentation to get started'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              }
              rightPanel={
                <RightPanel
                  activeTheme={activeTheme}
                  onThemeSelect={handleThemeSelect}
                  selectedDesignSystem={selectedDesignSystem}
                  onDesignSystemSelect={setSelectedDesignSystem}
                  onExportPptx={handleExport}
                  onExportHtml={handleExportHtml}
                  isExporting={isExportingPptx || isExportingHtml}
                  canExport={displayedSlides.length > 0}
                  onClose={() => setIsRightPanelOpen(false)}
                />
              }
              isRightPanelOpen={isRightPanelOpen}
              onRightPanelToggle={setIsRightPanelOpen}
              promptArea={
                <PromptInputExpanded
                  value={promptValue}
                  onChange={setPromptValue}
                  onGenerate={handleGenerate}
                  isGenerating={status.state === 'generating'}
                  onCancel={cancel}
                  slideCount={slideCount}
                  setSlideCount={setSlideCount}
                  readOnly={!!activePresentation}
                />
              }
            />
          )}
        </div>
      </div>

      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3.5 px-5 py-3.5 rounded-2xl border shadow-lg animate-fade-in select-none ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-800 shadow-emerald-100'
              : 'bg-white border-red-200 text-red-800 shadow-red-100'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">{toast.message}</span>
            {toast.action && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast.action?.onClick()
                }}
                className="text-[10px] font-bold text-[#0047ff] hover:text-blue-700 transition-colors uppercase tracking-wider text-left"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-1 p-0.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Slide Editing Modal */}
      <SlideEditModal
        slide={editingSlide}
        isOpen={editingSlide !== null}
        onSave={handleSaveEditedSlide}
        onClose={() => setEditingSlide(null)}
      />

      {/* Settings Overlay Drawer */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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
