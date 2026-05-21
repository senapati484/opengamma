import { useRef, useState, useEffect } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import Sidebar from './components/Sidebar'
import PromptInput from './components/PromptInput'
import ThemePicker from './components/ThemePicker'
import SlidePreview from './components/SlidePreview'
import SlideThumbnails from './components/SlideThumbnails'
import SlideEditModal from './components/SlideEditModal'
import { useStream } from './lib/useStream'
import { useElectron } from './lib/useElectron'
import { themes } from './lib/themes'
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
    setActivePresentation
  } = useAppContext()

  const { slides: streamedSlides, status, generate, cancel, reset: resetStream } = useStream()

  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
    action?: { label: string; onClick: () => void }
  } | null>(null)

  const [isExportingPptx, setIsExportingPptx] = useState(false)
  const [isExportingHtml, setIsExportingHtml] = useState(false)

  // Track the configuration used during the active generation
  const currentConfigRef = useRef<GenerationConfig | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [toast])

  // Determine which slides should be displayed in the preview panel
  const isGenerating = status.state === 'generating'
  const displayedSlides =
    isGenerating || streamedSlides.length > 0
      ? streamedSlides
      : activePresentation
        ? activePresentation.slides
        : []

  // Auto-Save presentation when generation completes successfully
  useEffect(() => {
    if (status.state === 'done' && streamedSlides.length > 0) {
      const saveNewPresentation = async () => {
        const titleText =
          streamedSlides[0]?.title || currentConfigRef.current?.prompt || 'Untitled Presentation'
        const newPres: Presentation = {
          id: `pres_${Date.now()}`,
          prompt: currentConfigRef.current?.prompt || '',
          theme: activeTheme?.id || 'startup-gradient',
          slides: streamedSlides,
          createdAt: Date.now(),
          title: titleText
        }

        try {
          await electronAPI.savePresentation(newPres)
          setPresentations((prev) => [newPres, ...prev])
          setActivePresentation(newPres)
          resetStream()
          setActiveSlideIndex(0)
          showToast('Presentation generated and saved!', 'success')
        } catch (err) {
          console.error('[App] Failed to auto-save presentation:', err)
          showToast('Failed to auto-save presentation', 'error')
        }
      }
      saveNewPresentation()
    } else if (status.state === 'error') {
      showToast(status.errorMessage || 'An error occurred during generation', 'error')
    }
  }, [status.state, streamedSlides])

  // Handle Select from Sidebar
  const handleSelectPresentation = (id: string) => {
    const found = presentations.find((p) => p.id === id)
    if (found) {
      setActivePresentation(found)
      const themeObj = themes.find((t) => t.id === found.theme) || themes[0]
      setActiveTheme(themeObj)
      resetStream()
      setActiveSlideIndex(0)
    }
  }

  // Handle Delete from Sidebar
  const handleDeletePresentation = async (id: string) => {
    try {
      await electronAPI.deletePresentation(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
      if (activePresentation?.id === id) {
        setActivePresentation(null)
        resetStream()
        setActiveSlideIndex(0)
      }
      showToast('Presentation deleted', 'success')
    } catch (err) {
      console.error('[App] Failed to delete presentation:', err)
      showToast('Failed to delete presentation', 'error')
    }
  }

  // Handle New Presentation Request
  const handleNewPresentation = () => {
    setActivePresentation(null)
    resetStream()
    setActiveSlideIndex(0)
  }

  // Handle Start Generation Config
  const handleGenerate = (config: GenerationConfig) => {
    currentConfigRef.current = config
    setActiveSlideIndex(0)
    generate(config)
  }

  // Handle Theme Selection: live preview and persistent update for active decks
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

  const handleEditSlide = (index: number) => {
    const slideToEdit = displayedSlides[index]
    if (slideToEdit) {
      setEditingSlide(slideToEdit)
    }
  }

  const handleRegenerateSlide = async (index: number) => {
    showToast('Regenerating slide...', 'success')
    setTimeout(async () => {
      if (!activePresentation) return

      const slideToRegen = activePresentation.slides[index]
      if (!slideToRegen) return

      let newHtml = slideToRegen.html
      if (!newHtml.includes('<!-- regenerated -->')) {
        newHtml = newHtml.replace('<section', '<section data-regenerated="true"')
        if (newHtml.includes('<h2>')) {
          newHtml = newHtml.replace('<h2>', '<h2>✨ ')
        } else if (newHtml.includes('<h1>')) {
          newHtml = newHtml.replace('<h1>', '<h1>✨ ')
        }
      }

      const updatedSlide: Slide = {
        ...slideToRegen,
        html: newHtml
      }

      const updatedSlides = activePresentation.slides.map((s, idx) =>
        idx === index ? updatedSlide : s
      )
      const updatedPres: Presentation = {
        ...activePresentation,
        slides: updatedSlides
      }

      setActivePresentation(updatedPres)
      setPresentations((prev) =>
        prev.map((p) => (p.id === activePresentation.id ? updatedPres : p))
      )

      try {
        await electronAPI.savePresentation(updatedPres)
        showToast(`Slide ${index + 1} regenerated successfully!`, 'success')
      } catch (err) {
        console.error('[App] Failed to save regenerated slide:', err)
      }
    }, 1500)
  }

  const handleSaveEditedSlide = async (title: string, bullets: string[], notes: string) => {
    if (!editingSlide) return

    const newHtml = reconstructSlideHtml(editingSlide.html, title, bullets, notes)

    const updatedSlide: Slide = {
      ...editingSlide,
      title,
      notes,
      html: newHtml
    }

    if (activePresentation) {
      const updatedSlides = activePresentation.slides.map((s) =>
        s.id === editingSlide.id ? updatedSlide : s
      )
      const updatedPres: Presentation = {
        ...activePresentation,
        slides: updatedSlides
      }
      setActivePresentation(updatedPres)
      setPresentations((prev) =>
        prev.map((p) => (p.id === activePresentation.id ? updatedPres : p))
      )
      try {
        await electronAPI.savePresentation(updatedPres)
        showToast('Slide updated and saved successfully!', 'success')
      } catch (err) {
        console.error('[App] Failed to save edited presentation:', err)
        showToast('Failed to save edited presentation', 'error')
      }
    }

    setEditingSlide(null)
  }

  // Ensure activeSlideIndex stays in bounds if displayedSlides count changes
  useEffect(() => {
    if (activeSlideIndex >= displayedSlides.length) {
      setActiveSlideIndex(Math.max(0, displayedSlides.length - 1))
    }
  }, [displayedSlides.length, activeSlideIndex])

  // Send navigation message to Reveal.js host iframe whenever activeSlideIndex changes
  useEffect(() => {
    const iframe = document.querySelector(
      'iframe[title="Live Slide Preview"]'
    ) as HTMLIFrameElement | null
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'GO_TO_SLIDE', index: activeSlideIndex }, '*')
    }
  }, [activeSlideIndex, displayedSlides])

  const handleShowInFinder = async (path: string) => {
    try {
      await electronAPI.exportPptx({ showFolderOnly: true, filePath: path } as any)
    } catch (err) {
      console.error('[App] Failed to show containing folder:', err)
    }
  }

  // Export Presentation to PowerPoint file
  const handleExport = async () => {
    const currentPres = activePresentation || {
      id: 'temp',
      prompt: currentConfigRef.current?.prompt || '',
      theme: activeTheme?.id || 'startup-gradient',
      slides: displayedSlides,
      createdAt: Date.now(),
      title: displayedSlides[0]?.title || 'Untitled Presentation'
    }

    if (!currentPres || currentPres.slides.length === 0) {
      showToast('No slides available to export', 'error')
      return
    }

    try {
      setIsExportingPptx(true)
      const result = await electronAPI.exportPptx(currentPres)
      if (result.success) {
        setToast({
          message: result.path ? `Saved to ${result.path}` : 'Saved to Desktop!',
          type: 'success',
          action: result.path
            ? {
                label: 'Show in Finder/Explorer',
                onClick: () => handleShowInFinder(result.path!)
              }
            : undefined
        })
      } else {
        showToast((result as any).error || 'Export failed', 'error')
      }
    } catch (err) {
      console.error('[App] Export error:', err)
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setIsExportingPptx(false)
    }
  }

  // Export Presentation to HTML file
  const handleExportHtml = async () => {
    const currentPres = activePresentation || {
      id: 'temp',
      prompt: currentConfigRef.current?.prompt || '',
      theme: activeTheme?.id || 'startup-gradient',
      slides: displayedSlides,
      createdAt: Date.now(),
      title: displayedSlides[0]?.title || 'Untitled Presentation'
    }

    if (!currentPres || currentPres.slides.length === 0) {
      showToast('No slides available to export', 'error')
      return
    }

    try {
      setIsExportingHtml(true)
      const result = await electronAPI.exportPptx({
        ...currentPres,
        exportFormat: 'html'
      } as any)

      if (result.success) {
        setToast({
          message: result.path ? `Saved to ${result.path}` : 'HTML presentation saved!',
          type: 'success',
          action: result.path
            ? {
                label: 'Show in Finder/Explorer',
                onClick: () => handleShowInFinder(result.path!)
              }
            : undefined
        })
      } else {
        showToast((result as any).error || 'HTML Export failed', 'error')
      }
    } catch (err) {
      console.error('[App] HTML Export error:', err)
      showToast(err instanceof Error ? err.message : 'HTML Export failed', 'error')
    } finally {
      setIsExportingHtml(false)
    }
  }

  // Keyboard Shortcut: Cmd/Ctrl + E to export PPTX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        handleExport()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleExport])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0d0d] text-neutral-100 font-sans antialiased">
      {/* Column 1: History & Navigation Sidebar */}
      <Sidebar
        presentations={presentations}
        activePresentationId={activePresentation?.id || null}
        onSelect={handleSelectPresentation}
        onDelete={handleDeletePresentation}
        onNewPresentation={handleNewPresentation}
      />

      {/* Column 2: Full Viewport Main Working Space */}
      <div className="flex-grow flex-1 flex flex-col h-full min-w-0 bg-[#0d0d0d] relative">
        {/* Top window drag region spacer */}
        <div className="h-10 w-full flex-none flex items-center justify-end px-6 select-none drag-region">
          {activePresentation && (
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest no-drag pointer-events-none">
              {activePresentation.title}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col p-6 pt-0 gap-6 overflow-hidden">
          {/* Top Panel: Resizing Prompt Input Area */}
          <PromptInput
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onCancel={cancel}
            activeTheme={activeTheme || undefined}
          />

          {/* Sub Panel: Curated Horizontal Swatch Row */}
          <ThemePicker themes={themes} selectedTheme={activeTheme} onSelect={handleThemeSelect} />

          {/* Interactive Viewer: Reveal.js Canvas Viewport */}
          <div className="flex-grow min-h-0 relative">
            <SlidePreview
              slides={displayedSlides}
              activeTheme={activeTheme || themes[0]}
              status={status}
            />
          </div>

          {/* Slide Outline thumbnails strip */}
          {displayedSlides.length > 0 && (
            <SlideThumbnails
              slides={displayedSlides}
              activeSlideIndex={activeSlideIndex}
              activeTheme={activeTheme || themes[0]}
              onSelectSlide={handleSelectSlide}
              onEditSlide={handleEditSlide}
              onRegenerateSlide={handleRegenerateSlide}
            />
          )}

          {/* Action Footer Bar: Slide Metadata & Export Panel */}
          {displayedSlides.length > 0 && (
            <div className="flex items-center justify-between p-4.5 rounded-2xl border border-white/[0.07] bg-[#161616] shadow-2xl animate-fade-in no-drag">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-neutral-200 truncate max-w-md">
                  {activePresentation?.title ||
                    currentConfigRef.current?.prompt ||
                    'Generated Presentation'}
                </span>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <span
                    key={displayedSlides.length}
                    className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-black/40 border border-white/10 text-neutral-200 animate-scale-bounce"
                  >
                    {displayedSlides.length}
                  </span>
                  <span>slides ready for presentation</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Secondary: Export HTML */}
                <button
                  onClick={handleExportHtml}
                  disabled={isExportingPptx || isExportingHtml}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-white/[0.07] transition-all select-none disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isExportingHtml ? (
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-neutral-300"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 text-neutral-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                      />
                    </svg>
                  )}
                  <span>Export HTML</span>
                </button>

                {/* Primary: Export PPTX */}
                <button
                  onClick={handleExport}
                  disabled={isExportingPptx || isExportingHtml}
                  className="flex items-center gap-2.5 px-5.5 py-3 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-violet-400 to-fuchsia-400 hover:opacity-95 active:scale-95 shadow-xl shadow-violet-500/20 transition-all select-none animate-export-pulse disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isExportingPptx ? (
                    <svg
                      className="animate-spin h-4 w-4 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-black"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  )}
                  <span>{isExportingPptx ? 'Exporting...' : 'Export PPTX'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Glassmorphic Toast Notification Container */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-4 px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl animate-fade-in select-none ${
            toast.type === 'success'
              ? 'bg-[#161616]/90 border-green-500/50 text-green-200 shadow-green-500/5'
              : 'bg-[#161616]/90 border-red-500/50 text-red-200 shadow-red-500/5'
          }`}
        >
          {toast.type === 'success' ? (
            <svg
              className="w-5 h-5 text-emerald-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">{toast.message}</span>
            {toast.action && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast.action?.onClick()
                }}
                className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider text-left"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slide Editing absolute overlay modal */}
      <SlideEditModal
        slide={editingSlide}
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
