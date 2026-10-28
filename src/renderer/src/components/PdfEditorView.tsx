import React, { useState, useEffect, useMemo } from 'react'
import type { Presentation, Theme, Slide } from '../types'
import { themes } from '../lib/themes'
import { useElectron } from '../lib/useElectron'

export interface PdfEditorViewProps {
  presentation: Presentation
  activeTheme: Theme
  onBack: () => void
  onUpdateTheme?: (theme: Theme) => void
}

export interface ExportSettings {
  format: 'pdf' | 'png' | 'pptx' | 'html' | 'md' | 'json'
  showPageNumbers: boolean
  includeSpeakerNotes: boolean
  pngScale: 1 | 2 | 3
}

export const PdfEditorView: React.FC<PdfEditorViewProps> = ({
  presentation,
  activeTheme,
  onBack,
  onUpdateTheme
}) => {
  const electronAPI = useElectron()

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'pdf',
    showPageNumbers: true,
    includeSpeakerNotes: false,
    pngScale: 2
  })

  // Theme selection state (synchronized with activeTheme prop)
  const [currentTheme, setCurrentTheme] = useState<Theme>(activeTheme)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [themeSearchQuery, setThemeSearchQuery] = useState('')

  useEffect(() => {
    setCurrentTheme(activeTheme)
  }, [activeTheme])

  const [exporting, setExporting] = useState(false)
  const [exportStage, setExportStage] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Keyboard navigation: Escape key returns to workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exporting) {
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack, exporting])

  const filteredThemes = useMemo(() => {
    if (!themeSearchQuery.trim()) return themes
    const q = themeSearchQuery.toLowerCase()
    return themes.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    )
  }, [themeSearchQuery])

  const handleExport = async () => {
    setExporting(true)
    setExportSuccess(null)
    setExportError(null)
    setExportProgress(12)
    setExportStage(
      settings.format === 'pdf'
        ? 'Initializing OpenGamma native vector engine...'
        : 'Initializing export pipeline...'
    )

    try {
      const presentationToExport = {
        ...presentation,
        theme: currentTheme.id,
        deck: presentation.deck
          ? {
              ...(presentation.deck as object),
              themeId: currentTheme.id
            }
          : undefined,
        exportFormat: settings.format,
        exportOptions: {
          showPageNumbers: settings.showPageNumbers,
          includeSpeakerNotes: settings.includeSpeakerNotes,
          pngScale: settings.pngScale
        }
      }

      setExportProgress(35)
      setExportStage(
        settings.format === 'pdf'
          ? 'Compiling structured scene graph & vector grid...'
          : 'Preparing document assets...'
      )

      const progressTimer = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 88) {
            clearInterval(progressTimer)
            return 88
          }
          return prev + 6
        })
        setExportStage((stage) => {
          if (stage.includes('Compiling') || stage.includes('Preparing')) {
            return settings.format === 'pdf'
              ? 'Drawing vector layout with native gradients...'
              : 'Encoding document frames...'
          }
          if (stage.includes('Drawing')) {
            return settings.format === 'pdf'
              ? 'Embedding bookmarks & writing binary PDF stream...'
              : 'Finalizing export archive...'
          }
          return stage
        })
      }, 600)

      const result = await electronAPI.exportPptx(presentationToExport as unknown as Presentation)

      clearInterval(progressTimer)
      setExportProgress(100)

      if (result.success && result.path) {
        setExportStage('Document saved successfully!')
        setExportSuccess(result.path)
      } else {
        setExportStage('Export was cancelled')
        if (!result.success) {
          throw new Error('Save dialog was cancelled or could not complete write.')
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed'
      console.error('[PdfEditorView] Export failed:', message)
      setExportError(message)
    } finally {
      setExporting(false)
    }
  }

  const handleShowInFolder = () => {
    if (exportSuccess) {
      electronAPI.exportPptx({
        id: presentation.id,
        showFolderOnly: true,
        filePath: exportSuccess
      } as unknown as Presentation)
    }
  }

  const formatList = [
    {
      id: 'pdf',
      label: 'Native Vector PDF',
      badge: 'VECTOR ENGINE',
      desc: 'Crisp vector geometry, embedded fonts & selectable text'
    },
    {
      id: 'pptx',
      label: 'PowerPoint (.pptx)',
      badge: 'NATIVE SHAPES',
      desc: 'Editable vector text boxes and slide master layout'
    },
    {
      id: 'png',
      label: 'PNG Slide Images',
      badge: 'RASTER',
      desc: 'High-resolution slide images in an organized folder'
    },
    {
      id: 'html',
      label: 'Reveal.js HTML',
      badge: 'WEB BUNDLE',
      desc: 'Standalone interactive web presentation package'
    },
    {
      id: 'md',
      label: 'Markdown Outline',
      badge: 'CLEAN TEXT',
      desc: 'Structured headings, bullet points, and speaker notes'
    },
    {
      id: 'json',
      label: 'JSON Data Model',
      badge: 'BACKUP',
      desc: 'Raw structured presentation schema for developers'
    }
  ] as const

  return (
    <div className="absolute inset-0 bg-[#0a0a0a] text-neutral-300 flex flex-col z-50 animate-fade-in font-sans antialiased">
      {/* Top Studio Navigation Bar */}
      <header className="h-14 px-6 flex-none bg-[#121212] border-b border-white/5 flex items-center justify-between z-10 select-none">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-all cursor-pointer group"
          title="Back to Workspace (Esc)"
        >
          <svg
            className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform text-neutral-400 group-hover:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Workspace</span>
          <span className="text-[10px] text-neutral-500 font-mono bg-white/5 px-1.5 py-0.5 rounded ml-1">
            Esc
          </span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-[0.2em]">
            Native Export Studio
          </span>
          <span className="text-xs font-bold text-white max-w-[340px] truncate">
            {presentation.title || 'Untitled Presentation'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-white/5 border border-white/5 text-neutral-300 px-2.5 py-1 rounded-full font-semibold">
            {presentation.slides.length} slides
          </span>
          <span className="text-[10px] bg-[#e8ff57]/10 border border-[#e8ff57]/20 text-[#e8ff57] px-2.5 py-1 rounded-full font-semibold">
            16:9 Vector
          </span>
        </div>
      </header>

      {/* Main Studio Body: Controls + Canvas */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Export Controls Sidebar */}
        <aside className="w-[360px] flex-none bg-[#0f0f0f] border-r border-white/5 flex flex-col min-h-0 select-none">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
            {/* Format Selection Grid */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Export Target Format
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {formatList.map((f) => {
                  const isSelected = settings.format === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSettings((s) => ({ ...s, format: f.id }))}
                      className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.99] cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-[#e8ff57]/40 shadow-sm'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                            {f.label}
                          </span>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              isSelected
                                ? 'bg-[#e8ff57] text-black'
                                : 'bg-white/5 text-neutral-500'
                            }`}
                          >
                            {f.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 leading-normal">
                          {f.desc}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-none mt-0.5 ${
                          isSelected
                            ? 'border-[#e8ff57] bg-[#e8ff57]'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Interactive Theme Switcher */}
            <div className="flex flex-col gap-2 border-t border-white/5 pt-5 relative">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Deck Design Theme
                </label>
                <button
                  type="button"
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="text-[10px] font-semibold text-[#e8ff57] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{showThemeDropdown ? 'Done' : 'Change Theme'}</span>
                  <svg
                    className={`w-3 h-3 transform transition-transform ${showThemeDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Current Active Theme Preview Card */}
              <button
                type="button"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="w-full p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer group"
              >
                <div
                  className="w-8 h-8 rounded-lg border border-white/20 flex-none shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.accent} 100%)`
                  }}
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {currentTheme.name}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#e8ff57] bg-[#e8ff57]/10 px-1.5 py-0.2 rounded border border-[#e8ff57]/20">
                      Active
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 leading-tight truncate">
                    {currentTheme.description}
                  </span>
                </div>
              </button>

              {/* Interactive Theme Selector Dropdown */}
              {showThemeDropdown && (
                <div className="flex flex-col gap-2 p-3 bg-[#141414] border border-white/10 rounded-xl shadow-2xl animate-fade-in mt-1 z-30">
                  <div className="relative">
                    <input
                      type="text"
                      value={themeSearchQuery}
                      onChange={(e) => setThemeSearchQuery(e.target.value)}
                      placeholder="Filter 15 design themes..."
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#e8ff57]"
                    />
                    {themeSearchQuery && (
                      <button
                        onClick={() => setThemeSearchQuery('')}
                        className="absolute right-2 top-1.5 text-xs text-neutral-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                    {filteredThemes.map((t) => {
                      const isSel = t.id === currentTheme.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setCurrentTheme(t)
                            onUpdateTheme?.(t)
                            setShowThemeDropdown(false)
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSel
                              ? 'bg-white/10 border border-[#e8ff57]/40 shadow-sm'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-md border border-white/15 flex-none"
                            style={{
                              background: `linear-gradient(135deg, ${t.colors.primary} 0%, ${t.colors.accent} 100%)`
                            }}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span
                              className={`text-[11px] font-bold truncate ${
                                isSel ? 'text-[#e8ff57]' : 'text-neutral-200'
                              }`}
                            >
                              {t.name}
                            </span>
                            <span className="text-[9px] text-neutral-400 truncate">
                              {t.description}
                            </span>
                          </div>
                          {isSel && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#e8ff57] flex-none" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Format-Specific Configuration */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
              {settings.format === 'pdf' && (
                <>
                  <div className="p-3.5 bg-[#e8ff57]/5 border border-[#e8ff57]/20 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#e8ff57] animate-pulse" />
                      <span className="text-xs font-bold text-[#e8ff57]">
                        Direct Vector Engine Active
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-300 leading-relaxed">
                      Generated directly via Node.js PDFKit stream. Mathematical 12-column grid, sub-pixel font metrics, and native vector shading with zero web-page distortion.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Vector Document Options
                    </label>
                    <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <label className="flex items-center justify-between py-1 cursor-pointer">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-white">
                            Show Page Numbers
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Stamps slide index counter in the footer
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.showPageNumbers}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, showPageNumbers: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-white/20 bg-[#161616] text-[#e8ff57] accent-[#e8ff57] cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between py-1 border-t border-white/5 pt-2 cursor-pointer">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-white">
                            Include Speaker Notes
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Outputs presenter script notes with document
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.includeSpeakerNotes}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, includeSpeakerNotes: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-white/20 bg-[#161616] text-[#e8ff57] accent-[#e8ff57] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {settings.format === 'png' && (
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    PNG Render Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.02] rounded-xl border border-white/5">
                    {[
                      { val: 1, label: '1x Web' },
                      { val: 2, label: '2x HD' },
                      { val: 3, label: '3x Print' }
                    ].map((s) => {
                      const isSel = settings.pngScale === s.val
                      return (
                        <button
                          key={s.val}
                          onClick={() => setSettings((st) => ({ ...st, pngScale: s.val as 1 | 2 | 3 }))}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#e8ff57] text-black font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {settings.format === 'pptx' && (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-200 leading-relaxed">
                  PowerPoint export compiles native shapes, solid background fills, and vector text containers using pptxgenjs. Opens natively in Microsoft PowerPoint, Apple Keynote, and Google Slides.
                </div>
              )}

              {settings.format === 'html' && (
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] text-purple-200 leading-relaxed">
                  Generates an independent, self-contained HTML bundle containing Reveal.js presentation engine, active design CSS, and keyboard navigation. Ready to deploy or host on the web.
                </div>
              )}

              {settings.format === 'md' && (
                <div className="p-3.5 bg-neutral-800/40 border border-white/5 rounded-xl text-[10px] text-neutral-300 leading-relaxed">
                  Extracts all slide titles, narrative paragraphs, bullet points, and speaker scripts into clean GitHub-flavored markdown. Ideal for blog posts and meeting notes.
                </div>
              )}

              {settings.format === 'json' && (
                <div className="p-3.5 bg-neutral-800/40 border border-white/5 rounded-xl text-[10px] text-neutral-300 leading-relaxed">
                  Exports the complete presentation schema (Zod Deck model, slide definitions, theme tokens, and metadata) as standard JSON for archival or programmatic integration.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Export Action Button */}
          <div className="flex-none p-6 border-t border-white/5 bg-[#121212]">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 px-4 rounded-xl bg-[#e8ff57] hover:bg-[#d8ef47] active:scale-[0.98] disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-[#e8ff57]/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              <span>Export {settings.format.toUpperCase()}</span>
            </button>
          </div>
        </aside>

        {/* Right Slide Canvas: Native Vector Preview */}
        <main className="flex-1 bg-[#090909] overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
          {/* Slide Navigation & Canvas Header */}
          <div className="max-w-[840px] w-full flex flex-col gap-3 mb-6 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {settings.format === 'md'
                    ? 'Live Markdown Outline'
                    : settings.format === 'json'
                      ? 'Structured JSON Model'
                      : 'Live Vector Slide Frames'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  ({presentation.slides.length} slides)
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#e8ff57] bg-[#e8ff57]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Theme: {currentTheme.name}
              </span>
            </div>

            {/* Slide Quick Jump Navigation */}
            {settings.format !== 'md' && settings.format !== 'json' && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex-none mr-1">
                  Jump to:
                </span>
                {presentation.slides.map((_, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => {
                      const el = document.getElementById(`vector-slide-frame-${sIdx}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 text-[10px] font-bold text-neutral-300 hover:text-white transition-all cursor-pointer flex-none"
                    title={`Jump to Slide ${sIdx + 1}`}
                  >
                    Slide {sIdx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {settings.format === 'md' ? (
            <div className="max-w-[840px] w-full bg-[#121212] border border-white/5 rounded-2xl p-8 shadow-xl text-neutral-300 select-text leading-relaxed">
              <h1 className="text-2xl font-black text-white mb-6 border-b border-white/5 pb-4">
                {presentation.title || 'Untitled Presentation'}
              </h1>
              {presentation.slides.map((s, idx) => (
                <div key={s.id} className="mb-6 pb-6 border-b border-white/5 last:border-b-0">
                  <h2 className="text-lg font-bold text-white mb-2">
                    Slide {idx + 1}: {s.title || 'Untitled Slide'}
                  </h2>
                  <p className="text-neutral-400 text-xs whitespace-pre-wrap leading-relaxed">
                    {s.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                  </p>
                  {settings.includeSpeakerNotes && s.notes && (
                    <div className="mt-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-neutral-400 italic">
                      <span className="text-[9px] font-bold text-[#e8ff57] not-italic block mb-1">
                        SPEAKER SCRIPT:
                      </span>
                      {s.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : settings.format === 'json' ? (
            <div className="max-w-[840px] w-full bg-[#121212] border border-white/5 rounded-2xl p-6 shadow-xl font-mono text-xs text-neutral-400 overflow-x-auto select-text">
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(
                  {
                    id: presentation.id,
                    title: presentation.title,
                    theme: currentTheme.id,
                    aspectRatio: presentation.aspectRatio || '16:9',
                    slides: presentation.slides.map((s) => ({
                      index: s.index,
                      title: s.title,
                      slideType: s.slideType,
                      notes: s.notes
                    }))
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            /* Native Vector Slide Frames Stack */
            <div className="max-w-[840px] w-full flex flex-col gap-8 pb-16">
              {presentation.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  id={`vector-slide-frame-${index}`}
                  className="flex flex-col gap-2 scroll-mt-6"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Slide {index + 1} • {(slide.slideType || 'content').toUpperCase()}
                    </span>
                    <span className="text-[9px] text-neutral-600 font-mono">
                      16:9 VECTOR FRAME
                    </span>
                  </div>

                  <NativeVectorSlidePreview
                    slide={slide}
                    index={index}
                    total={presentation.slides.length}
                    presentation={presentation}
                    theme={currentTheme}
                    showPageNumbers={settings.showPageNumbers}
                  />

                  {settings.includeSpeakerNotes && slide.notes && (
                    <div className="p-3.5 rounded-xl border border-white/5 bg-[#121212] text-xs flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-[#e8ff57] uppercase tracking-wider">
                        Presenter Script (Slide {index + 1})
                      </span>
                      <p className="text-neutral-400 italic text-[11px] leading-relaxed">
                        {slide.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Exporting Progress Modal */}
      {exporting && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in select-none">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-[400px] w-full flex flex-col items-center shadow-2xl relative overflow-hidden">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#e8ff57] animate-spin mb-5" />

            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1.5">
              Generating Vector Document
            </h3>
            <p className="text-xs text-neutral-400 mb-6 text-center leading-relaxed">
              {exportStage}
            </p>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#e8ff57] transition-all duration-300 rounded-full"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-neutral-500">
              {exportProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Export Success Modal */}
      {exportSuccess && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in select-none">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-[460px] w-full flex flex-col items-center shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#e8ff57]/10 border border-[#e8ff57]/30 text-[#e8ff57] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(232,255,87,0.15)]">
              <svg className="w-6 h-6 text-[#e8ff57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-white mb-1.5">
              Export Complete!
            </h3>
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Your presentation was compiled and saved to disk.
            </p>

            <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-3 mb-6 text-left">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Output File Path
              </span>
              <span className="text-[11px] text-neutral-300 break-all font-mono select-text font-semibold">
                {exportSuccess}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleShowInFolder}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                Show in Folder
              </button>
              <button
                onClick={() => setExportSuccess(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#e8ff57] hover:bg-[#d8ef47] text-xs font-black uppercase tracking-wider text-black transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Error Modal */}
      {exportError && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in select-none">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-[420px] w-full flex flex-col items-center shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Export Failed
            </h3>
            <p className="text-xs text-red-400 mb-6 leading-relaxed bg-red-500/5 border border-red-500/10 rounded-xl p-3 w-full font-mono text-left max-h-[140px] overflow-y-auto">
              {exportError}
            </p>

            <button
              onClick={() => setExportError(null)}
              className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Native Vector Slide Preview Component ─────────────────────────────────────
// Pure React vector renderer that mirrors the PDFKit scene graph layout without
// needing an iframe or Reveal.js HTML.

interface NativeSlidePreviewProps {
  slide: Slide
  index: number
  total: number
  presentation: Presentation
  theme: Theme
  showPageNumbers: boolean
}

const NativeVectorSlidePreview: React.FC<NativeSlidePreviewProps> = ({
  slide,
  index,
  total,
  presentation,
  theme,
  showPageNumbers
}) => {
  const parsed = parseSlideForVectorPreview(slide)
  const isTitle = parsed.layout === 'title' || index === 0
  const isSection = parsed.layout === 'section'
  const isClosing = parsed.layout === 'closing' || parsed.layout === 'cta' || index === total - 1
  const isTable = parsed.layout === 'table' || (parsed.table && parsed.table.headers.length > 0)
  const isTimeline = parsed.layout === 'timeline' || (parsed.timeline && parsed.timeline.length > 0)
  const isImageLeft = parsed.layout === 'image-left'
  const isImageRight = parsed.layout === 'image-right' || (parsed.image && !isImageLeft)
  const isTwoCol = parsed.layout === 'two-col' || !!parsed.split
  const isCards = parsed.layout === 'cards' || parsed.cards.length > 0
  const isStats = parsed.layout === 'stats' || parsed.stats.length > 0
  const isQuote = parsed.layout === 'quote' || !!parsed.quote

  const accentColor = theme.colors.accent || '#e8ff57'
  const primaryColor = theme.colors.primary || '#6366f1'
  const bgColor = theme.colors.bg || '#111827'

  return (
    <div
      className="w-full aspect-video rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl p-7 flex flex-col justify-between select-none"
      style={{
        background: `radial-gradient(circle at 50% 20%, ${primaryColor}26 0%, ${bgColor} 75%)`,
        backgroundColor: bgColor
      }}
    >
      {/* Ambient Top Glow Layer */}
      <div
        className="absolute top-0 inset-x-0 h-44 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accentColor} 0%, transparent 70%)`
        }}
      />

      {/* Top Header Region (Hidden on pure section dividers for dramatic focus) */}
      {!isSection && (
        <div className="flex flex-col gap-1.5 relative z-10">
          {/* Eyebrow Badge (if present) */}
          {(parsed.badge || parsed.eyebrow) && (
            <div className="flex items-center">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{
                  color: accentColor,
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}33`
                }}
              >
                {parsed.badge || parsed.eyebrow}
              </span>
            </div>
          )}

          {/* Slide Title */}
          <div className="flex items-start gap-2.5">
            {!isTitle && !isClosing && (
              <div
                className="w-1 h-5 rounded-full flex-none mt-1"
                style={{ backgroundColor: accentColor }}
              />
            )}
            <h2
              className={`font-black text-white tracking-tight ${
                isTitle || isClosing
                  ? 'text-2xl md:text-3xl text-center w-full mt-2 leading-tight'
                  : 'text-lg md:text-xl leading-tight'
              }`}
            >
              {parsed.title}
            </h2>
          </div>
        </div>
      )}

      {/* Main Slide Content Layout Area */}
      <div className="flex-1 flex flex-col justify-center my-3 relative z-10 min-h-0">
        {/* 1. Title Slide Layout */}
        {isTitle && (
          <div className="flex flex-col items-center text-center max-w-[620px] mx-auto gap-3">
            {parsed.bullets.length > 0 && (
              <p className="text-neutral-300 text-xs md:text-sm font-medium leading-relaxed">
                {parsed.bullets[0]}
              </p>
            )}
            {parsed.paragraphs.length > 0 && (
              <p className="text-neutral-400 text-[11px] leading-relaxed max-w-[480px]">
                {parsed.paragraphs[0]}
              </p>
            )}
            <div
              className="px-3.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm mt-1"
              style={{
                backgroundColor: accentColor,
                color: '#000000'
              }}
            >
              OpenGamma Deck
            </div>
          </div>
        )}

        {/* 2. Section Divider Layout */}
        {!isTitle && isSection && (
          <div className="flex flex-col justify-center items-start max-w-[600px] pl-4 relative">
            <span
              className="text-7xl font-black font-mono leading-none select-none opacity-20 -mb-4 -ml-1"
              style={{ color: accentColor }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div
              className="w-12 h-1 rounded-full mb-3"
              style={{ backgroundColor: accentColor }}
            />
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight mb-2">
              {parsed.title}
            </h1>
            {(parsed.paragraphs[0] || parsed.bullets[0]) && (
              <p className="text-xs text-neutral-300 leading-relaxed max-w-[500px]">
                {parsed.paragraphs[0] || parsed.bullets[0]}
              </p>
            )}
          </div>
        )}

        {/* 3. Table Layout */}
        {!isTitle && !isSection && isTable && parsed.table && (
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {parsed.table.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: accentColor }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.table.rows.slice(0, 5).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`border-b border-white/5 last:border-b-0 ${
                      rIdx % 2 === 1 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[10px] text-neutral-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Timeline / Roadmap Layout */}
        {!isTitle && !isSection && !isTable && isTimeline && parsed.timeline && (
          <div className="w-full flex flex-col justify-center">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 relative">
              {/* Connecting Accent Line */}
              <div
                className="absolute top-3 inset-x-8 h-[2px] opacity-40 z-0"
                style={{ backgroundColor: accentColor }}
              />

              {parsed.timeline.slice(0, 4).map((item, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col gap-1 relative z-10 shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                      style={{ backgroundColor: accentColor }}
                    >
                      {i + 1}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider truncate"
                      style={{ color: accentColor }}
                    >
                      {item.label || `Phase ${i + 1}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {item.title}
                  </span>
                  {item.body && (
                    <p className="text-[10px] text-neutral-300 leading-snug line-clamp-3 mt-0.5">
                      {item.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Image Left Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && isImageLeft && (
          <div className="grid grid-cols-12 gap-4 w-full items-center">
            <div className="col-span-5 h-[190px] rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] flex items-center justify-center relative">
              {parsed.image?.src ? (
                <img
                  src={parsed.image.src}
                  alt={parsed.image.alt || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-500 p-4 text-center">
                  <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Image Frame</span>
                </div>
              )}
            </div>
            <div className="col-span-7 flex flex-col gap-2">
              {parsed.bullets.slice(0, 4).map((bullet, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs text-neutral-300 leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Image Right Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && isImageRight && (
          <div className="grid grid-cols-12 gap-4 w-full items-center">
            <div className="col-span-7 flex flex-col gap-2">
              {parsed.bullets.slice(0, 4).map((bullet, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs text-neutral-300 leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
            <div className="col-span-5 h-[190px] rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] flex items-center justify-center relative">
              {parsed.image?.src ? (
                <img
                  src={parsed.image.src}
                  alt={parsed.image.alt || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-500 p-4 text-center">
                  <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Image Frame</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Cards Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && isCards && (
          <div
            className={`grid gap-3 w-full ${
              parsed.cards.length === 2
                ? 'grid-cols-2'
                : parsed.cards.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-4'
            }`}
          >
            {parsed.cards.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col gap-1 relative overflow-hidden shadow-lg"
              >
                <div
                  className="absolute top-0 inset-x-0 h-[2px]"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="text-xs font-bold text-white mt-1 leading-snug">
                  {c.title}
                </span>
                {c.body && (
                  <p className="text-[10px] text-neutral-300 leading-relaxed line-clamp-4">
                    {c.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 8. Stats Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && !isCards && isStats && (
          <div
            className={`grid gap-3 w-full ${
              parsed.stats.length === 2
                ? 'grid-cols-2'
                : parsed.stats.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-4'
            }`}
          >
            {parsed.stats.slice(0, 4).map((st, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex flex-col justify-center items-center text-center gap-1 shadow-lg"
              >
                <span
                  className="text-2xl md:text-3xl font-black tracking-tight"
                  style={{ color: accentColor }}
                >
                  {st.value}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 9. Quote Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && !isCards && !isStats && isQuote && parsed.quote && (
          <div className="max-w-[560px] mx-auto bg-white/[0.03] border border-white/10 rounded-2xl p-5 relative">
            <span
              className="text-4xl font-serif leading-none absolute -top-3 left-4 select-none opacity-40"
              style={{ color: accentColor }}
            >
              “
            </span>
            <p className="text-sm font-medium italic text-neutral-200 leading-relaxed mb-2.5">
              {parsed.quote.text}
            </p>
            {parsed.quote.author && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-[1px]" style={{ backgroundColor: accentColor }} />
                <span className="text-xs font-bold" style={{ color: accentColor }}>
                  {parsed.quote.author}
                </span>
                {parsed.quote.role && (
                  <span className="text-[10px] text-neutral-400">
                    • {parsed.quote.role}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 10. Two-Column Split Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && !isCards && !isStats && !isQuote && isTwoCol && parsed.split && (
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-white border-b border-white/5 pb-1">
                {parsed.split.leftTitle}
              </span>
              <div className="flex flex-col gap-1">
                {parsed.split.leftItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="text-[11px] text-neutral-300 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-white border-b border-white/5 pb-1">
                {parsed.split.rightTitle}
              </span>
              <div className="flex flex-col gap-1">
                {parsed.split.rightItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="text-[11px] text-neutral-300 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 11. Closing / CTA Layout */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && !isCards && !isStats && !isQuote && !isTwoCol && isClosing && (
          <div className="flex flex-col items-center text-center max-w-[560px] mx-auto gap-3">
            <p className="text-xs text-neutral-300 leading-relaxed font-medium">
              {parsed.cta?.subtext || parsed.paragraphs[0] || 'Ready to begin your journey? Get started today.'}
            </p>
            <div
              className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-black shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              {parsed.cta?.text || 'Get in Touch'}
            </div>
          </div>
        )}

        {/* 12. Standard Bullet List Content Layout (Default) */}
        {!isTitle && !isSection && !isTable && !isTimeline && !isImageLeft && !isImageRight && !isCards && !isStats && !isQuote && !isTwoCol && !isClosing && (
          <div className="flex flex-col gap-2 max-w-[680px]">
            {parsed.bullets.slice(0, 5).map((bullet, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-none mt-1.5"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="text-xs text-neutral-300 leading-relaxed font-normal">
                  {bullet}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta: Slide Number & Presentation Branding */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
        <span className="text-[9px] font-medium text-neutral-500 truncate max-w-[280px]">
          {presentation.title || 'OpenGamma'}
        </span>
        {showPageNumbers && !isTitle && !isClosing && (
          <span className="text-[9px] font-mono font-bold text-neutral-400 bg-white/5 px-2 py-0.5 rounded">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Lightweight Vector Slide Content Parser ──────────────────────────────────
// Inspects slide.deckSlide first if present, then falls back to resilient DOM extraction.

interface ParsedCard {
  title: string
  body?: string
}

interface ParsedStat {
  value: string
  label: string
}

interface ParsedQuote {
  text: string
  author?: string
  role?: string
}

interface ParsedSplit {
  leftTitle: string
  rightTitle: string
  leftItems: string[]
  rightItems: string[]
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

interface ParsedTimelineItem {
  label: string
  title: string
  body?: string
}

interface ParsedImage {
  src: string
  alt?: string
}

interface ParsedCta {
  text: string
  subtext?: string
}

interface ParsedSlideData {
  layout: string
  title: string
  badge?: string
  eyebrow?: string
  bullets: string[]
  paragraphs: string[]
  cards: ParsedCard[]
  stats: ParsedStat[]
  quote?: ParsedQuote
  split?: ParsedSplit
  table?: ParsedTable
  timeline?: ParsedTimelineItem[]
  image?: ParsedImage
  cta?: ParsedCta
}

function parseSlideForVectorPreview(slide: Slide): ParsedSlideData {
  // If slide.deckSlide is present, read directly from the structured blocks
  const deckSlide = slide.deckSlide as
    | {
        layout?: string
        blocks?: Array<{
          type: string
          text?: string
          level?: number
          badge?: string
          eyebrow?: string
          items?: unknown[]
          cards?: ParsedCard[]
          stats?: ParsedStat[]
          author?: string
          role?: string
          leftLabel?: string
          rightLabel?: string
          leftItems?: string[]
          rightItems?: string[]
          headers?: string[]
          rows?: string[][]
          src?: string
          alt?: string
          subtext?: string
        }>
      }
    | undefined

  if (deckSlide && typeof deckSlide === 'object' && Array.isArray(deckSlide.blocks)) {
    let layout = deckSlide.layout || slide.slideType || 'content'
    let title = slide.title || ''
    let badge: string | undefined = undefined
    let eyebrow: string | undefined = undefined
    const bullets: string[] = []
    const paragraphs: string[] = []
    const cards: ParsedCard[] = []
    const stats: ParsedStat[] = []
    let quote: ParsedQuote | undefined = undefined
    let split: ParsedSplit | undefined = undefined
    let table: ParsedTable | undefined = undefined
    let timeline: ParsedTimelineItem[] | undefined = undefined
    let image: ParsedImage | undefined = undefined
    let cta: ParsedCta | undefined = undefined

    for (const block of deckSlide.blocks) {
      if (!block || typeof block !== 'object') continue
      switch (block.type) {
        case 'heading':
          if (!title || block.level === 1) title = block.text || title
          if (block.badge) badge = block.badge
          if (block.eyebrow) eyebrow = block.eyebrow
          break
        case 'text':
          if (block.text) paragraphs.push(block.text)
          break
        case 'bullets':
          if (Array.isArray(block.items)) {
            for (const it of block.items) {
              if (typeof it === 'string') bullets.push(it)
              else if (it && typeof it === 'object') {
                const itemObj = it as { text?: string; title?: string; body?: string }
                const formatted =
                  itemObj.title && itemObj.body
                    ? `${itemObj.title} — ${itemObj.body}`
                    : itemObj.text || itemObj.title || itemObj.body || ''
                if (formatted) bullets.push(formatted)
              }
            }
          }
          break
        case 'cards':
          if (Array.isArray(block.cards)) {
            cards.push(...block.cards)
          }
          break
        case 'stats':
          if (Array.isArray(block.stats)) {
            stats.push(...block.stats)
          }
          break
        case 'quote':
          if (block.text) {
            quote = { text: block.text, author: block.author, role: block.role }
          }
          break
        case 'two-col':
          split = {
            leftTitle: block.leftLabel || 'Overview',
            rightTitle: block.rightLabel || 'Details',
            leftItems: block.leftItems || [],
            rightItems: block.rightItems || []
          }
          break
        case 'table':
          if (Array.isArray(block.headers)) {
            table = { headers: block.headers, rows: block.rows || [] }
          }
          break
        case 'timeline':
          if (Array.isArray(block.items)) {
            timeline = block.items as ParsedTimelineItem[]
          }
          break
        case 'image':
          if (block.src) {
            image = { src: block.src, alt: block.alt }
          }
          break
        case 'cta':
          if (block.text) {
            cta = { text: block.text, subtext: block.subtext }
          }
          break
      }
    }

    return {
      layout,
      title: title || 'Untitled Slide',
      badge,
      eyebrow,
      bullets: bullets.length > 0 ? bullets : slide.bullets || [],
      paragraphs,
      cards,
      stats,
      quote,
      split,
      table,
      timeline,
      image,
      cta
    }
  }

  // Fallback: DOM-based extraction
  let title = slide.title || ''
  let badge: string | undefined = undefined
  let eyebrow: string | undefined = undefined
  const cards: ParsedCard[] = []
  const stats: ParsedStat[] = []
  let quote: ParsedQuote | undefined = undefined
  let split: ParsedSplit | undefined = undefined
  let table: ParsedTable | undefined = undefined
  let timeline: ParsedTimelineItem[] | undefined = undefined
  let image: ParsedImage | undefined = undefined
  let cta: ParsedCta | undefined = undefined
  const bullets: string[] = []
  const paragraphs: string[] = []
  let layout: string = slide.slideType || 'content'

  const html = slide.html || ''

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const section = doc.querySelector('section') || doc.body

    const rawType = section.getAttribute('data-slide-type')
    if (rawType) layout = rawType

    // Eyebrow / Badge
    const badgeEl = section.querySelector('.badge, [class*="badge"], .og-eyebrow, .eyebrow')
    if (badgeEl) {
      badge = badgeEl.textContent?.trim()
      badgeEl.remove()
    }

    // Heading
    const h1 = section.querySelector('h1')
    const h2 = section.querySelector('h2')
    const heading = h1 || h2
    if (heading?.textContent) {
      title = heading.textContent.trim()
      heading.remove()
    }

    // Table extraction
    const tableEl = section.querySelector('table')
    if (tableEl) {
      layout = 'table'
      const ths = Array.from(tableEl.querySelectorAll('th')).map((th) => th.textContent?.trim() || '')
      const trs = Array.from(tableEl.querySelectorAll('tbody tr, tr')).filter(
        (tr) => tr.querySelectorAll('td').length > 0
      )
      const rows = trs.map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '')
      )
      if (ths.length > 0 || rows.length > 0) {
        table = { headers: ths, rows }
      }
      tableEl.remove()
    }

    // Image extraction
    const imgEl = section.querySelector('img, figure.og-image-figure img')
    if (imgEl) {
      const src = imgEl.getAttribute('src') || ''
      const alt = imgEl.getAttribute('alt') || ''
      if (src) {
        image = { src, alt }
        if (layout === 'content') layout = 'image-right'
      }
    }

    // Cards
    const cardNodes = Array.from(section.querySelectorAll('.card, [class*="card"], .og-card'))
    cardNodes.forEach((c) => {
      const tEl = c.querySelector('h3, h4, strong, b, .card-title, .og-heading')
      const bEl = c.querySelector('p, .card-body, .og-card-body')
      const cTitle = tEl?.textContent?.trim() || ''
      const cBody = bEl?.textContent?.trim() || ''
      if (cTitle || cBody) {
        cards.push({ title: cTitle || cBody, body: cTitle ? cBody : undefined })
      }
      c.remove()
    })

    // Stats
    const statNodes = Array.from(
      section.querySelectorAll('.stat-block, [class*="stat-block"], .og-stat-card')
    )
    statNodes.forEach((st) => {
      const vEl = st.querySelector(
        '.stat-number, [class*="stat-number"], .og-stat-value, strong, b'
      )
      const lEl = st.querySelector(
        '.stat-label, [class*="stat-label"], .og-stat-label, p, span:last-child'
      )
      const val = vEl?.textContent?.trim() || ''
      const lbl = lEl?.textContent?.trim() || ''
      if (val) {
        stats.push({ value: val, label: lbl })
      }
      st.remove()
    })

    // Quote
    const quoteNode = section.querySelector('.quote-block, blockquote, [class*="quote"]')
    if (quoteNode) {
      const textEl = quoteNode.querySelector('.quote-text, .og-quote-text, p') || quoteNode
      const authorEl = quoteNode.querySelector('.quote-author, [class*="author"], cite, small')
      const qText = textEl.textContent?.trim() || ''
      if (qText) {
        quote = { text: qText, author: authorEl?.textContent?.trim() }
      }
      quoteNode.remove()
    }

    // Two-Column
    const splitContainer = section.querySelector(
      '.og-asymmetric-split, .og-split-wrap, [class*="split-wrap"], .cols'
    )
    if (splitContainer && splitContainer.children.length >= 2) {
      const leftEl = splitContainer.children[0]
      const rightEl = splitContainer.children[1]
      const leftTitle = leftEl.querySelector('h3, h4')?.textContent?.trim() || 'Column A'
      const rightTitle = rightEl.querySelector('h3, h4')?.textContent?.trim() || 'Column B'
      const leftItems = Array.from(leftEl.querySelectorAll('li, p'))
        .map((p) => p.textContent?.trim() || '')
        .filter(Boolean)
      const rightItems = Array.from(rightEl.querySelectorAll('li, p'))
        .map((p) => p.textContent?.trim() || '')
        .filter(Boolean)
      split = { leftTitle, rightTitle, leftItems, rightItems }
      splitContainer.remove()
    }

    // Bullets / Paragraphs
    if (slide.bullets && slide.bullets.length > 0) {
      bullets.push(...slide.bullets)
    } else {
      const listItems = Array.from(section.querySelectorAll('li'))
      if (listItems.length > 0) {
        listItems.forEach((li) => {
          const txt = li.textContent?.trim()
          if (txt) bullets.push(txt)
        })
      } else {
        const pNodes = Array.from(section.querySelectorAll('p'))
        pNodes.forEach((p) => {
          const txt = p.textContent?.trim()
          if (txt) paragraphs.push(txt)
        })
      }
    }
  } catch (err) {
    console.warn('[parseSlideForVectorPreview] DOM parsing fallback:', err)
  }

  const cleanBullets = bullets
    .map((b) => b.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)

  return {
    layout,
    title: title || 'Untitled Slide',
    badge,
    eyebrow,
    cards,
    stats,
    quote,
    split,
    table,
    timeline,
    image,
    cta,
    bullets: cleanBullets,
    paragraphs
  }
}
