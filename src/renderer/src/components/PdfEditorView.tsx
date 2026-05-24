import React, { useState } from 'react'
import type { Presentation, Theme } from '../types'
import { useElectron } from '../lib/useElectron'

export interface PdfEditorViewProps {
  presentation: Presentation
  activeTheme: Theme
  onBack: () => void
}

export interface ExportSettings {
  format: 'pdf' | 'png' | 'pptx' | 'html' | 'md' | 'json'
  pageSize: 'A4' | 'Letter'
  orientation: 'landscape' | 'portrait'
  preset: 'original' | 'ink-saver' | 'monochromatic'
  margins: 'none' | 'small' | 'medium' | 'large'
  includeSpeakerNotes: boolean
  showPageNumbers: boolean
  headingFont: 'original' | string
  bodyFont: 'original' | string
  pngScale: 1 | 2 | 3
}

export const PdfEditorView: React.FC<PdfEditorViewProps> = ({
  presentation,
  activeTheme,
  onBack
}) => {
  const electronAPI = useElectron()

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'pdf',
    pageSize: 'A4',
    orientation: 'landscape',
    preset: 'original',
    margins: 'none',
    includeSpeakerNotes: false,
    showPageNumbers: true,
    headingFont: 'original',
    bodyFont: 'original',
    pngScale: 2
  })

  const [exporting, setExporting] = useState(false)
  const [exportStage, setExportStage] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // A list of gorgeous premium Google fonts for overrides
  const fontOptions = [
    { value: 'original', label: 'Theme Original' },
    { value: 'Inter', label: 'Inter (Sleek Neo-Grotesque)' },
    { value: 'Outfit', label: 'Outfit (Modern Tech Geometric)' },
    { value: 'Syne', label: 'Syne (Avant-Garde Punchy)' },
    { value: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible (Maximum Readability)' },
    { value: 'Playfair Display', label: 'Playfair Display (Prestigious Editorial Serif)' },
    { value: 'JetBrains Mono', label: 'JetBrains Mono (Console Hacker Tech)' },
    { value: 'Space Grotesk', label: 'Space Grotesk (Quirky Engineering Tech)' },
    { value: 'Fredoka', label: 'Fredoka (Soft Rounded Modern)' },
    { value: 'Bodoni Moda', label: 'Bodoni Moda (High Fashion Luxury Serif)' },
    { value: 'Montserrat', label: 'Montserrat (Solid Neutral Sans)' },
    { value: 'EB Garamond', label: 'EB Garamond (Classical Fine Literature Serif)' },
    { value: 'Sora', label: 'Sora (Energetic Tech Sans)' },
    { value: 'Cinzel', label: 'Cinzel (Royal Calligraphic Capital Serif)' },
    { value: 'Fraunces', label: 'Fraunces (Warm Editorial Soft Serif)' }
  ]

  const handleExport = async () => {
    setExporting(true)
    setExportSuccess(null)
    setExportError(null)
    setExportProgress(10)
    setExportStage('Initializing offscreen renderer...')

    try {
      // Connect to IPC channels
      // We pass the full settings along with presentation so that the main process exporter handles them
      const presentationToExport = {
        ...presentation,
        exportFormat: settings.format,
        exportOptions: settings
      }

      setExportProgress(30)
      setExportStage('Preparing dynamic print booklet stylesheets...')

      // Simulate rendering progress for a slick native feel
      const progressInterval = setInterval(() => {
        setExportProgress((p) => {
          if (p >= 85) {
            clearInterval(progressInterval)
            return 85
          }
          return p + 5
        })
        setExportStage((stage) => {
          if (stage.includes('Preparing')) return 'Spawning hidden Electron browser viewport...'
          if (stage.includes('Spawning')) return 'Rendering individual slides in high resolution...'
          if (stage.includes('Rendering'))
            return 'Injecting custom styling & typography overrides...'
          if (stage.includes('Injecting')) return 'Compiling document frames...'
          return stage
        })
      }, 700)

      const result = await electronAPI.exportPptx(presentationToExport as any)

      clearInterval(progressInterval)
      setExportProgress(100)

      if (result.success && result.path) {
        setExportStage('Successfully saved to disk!')
        setExportSuccess(result.path)
      } else {
        setExportStage('Export was cancelled or failed')
        if (!result.success) {
          throw new Error('Save dialog was cancelled or another failure occurred.')
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown export failure'
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
      } as any)
    }
  }

  // Get active slide frames layout
  const isLandscape = settings.orientation === 'landscape'
  const isA4 = settings.pageSize === 'A4'

  // Standard aspect ratio mappings for the scrollable canvas previews
  // Letter Landscape: 11 x 8.5 (1.29)
  // A4 Landscape: 297 x 210 (1.41)
  // Portrait: inverse
  let cardAspectRatio = 'aspect-[1.414]' // A4 landscape
  if (!isLandscape) {
    cardAspectRatio = isA4 ? 'aspect-[0.707]' : 'aspect-[0.773]'
  } else {
    cardAspectRatio = isA4 ? 'aspect-[1.414]' : 'aspect-[1.294]'
  }

  return (
    <div className="absolute inset-0 bg-[#0d0d0d] text-neutral-300 flex flex-col z-50 animate-fade-in font-sans">
      {/* Custom Title Bar / Header */}
      <div className="h-14 px-6 flex-none bg-[#141414] border-b border-white/5 flex items-center justify-between z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-all uppercase tracking-widest cursor-pointer group"
        >
          <svg
            className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform"
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
          Back to Workspace
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.25em]">
            Export Studio
          </span>
          <span className="text-xs font-bold text-white max-w-[320px] truncate">
            {presentation.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[9px] bg-white/5 border border-white/5 text-neutral-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider select-none">
            {presentation.slides.length} slides
          </span>
          <span className="text-[9px] bg-blue-500/10 border border-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider select-none">
            {presentation.aspectRatio || '16:9'} aspect
          </span>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Side Options Panel */}
        <div className="w-[360px] flex-none bg-[#101010] border-r border-white/5 flex flex-col min-h-0 select-none overflow-y-auto custom-scrollbar no-drag">
          <div className="p-6 flex flex-col gap-6">
            {/* Format Segmented Selection Tabs */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Export Target Format
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                {[
                  { id: 'pdf', label: 'PDF Booklet', icon: '📄' },
                  { id: 'png', label: 'PNG Images', icon: '🖼️' },
                  { id: 'pptx', label: 'PowerPoint', icon: '📊' },
                  { id: 'html', label: 'Reveal HTML', icon: '🌐' },
                  { id: 'md', label: 'Markdown Outline', icon: '📝' },
                  { id: 'json', label: 'Raw JSON Schema', icon: '⚙️' }
                ].map((f) => {
                  const isSel = settings.format === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSettings((s) => ({ ...s, format: f.id as any }))}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all active:scale-[0.97] cursor-pointer ${
                        isSel
                          ? 'bg-[#e8ff57] border-[#e8ff57] text-black shadow-lg shadow-[#e8ff57]/10 font-bold'
                          : 'text-neutral-400 border-transparent hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-base mb-0.5">{f.icon}</span>
                      <span className="text-[10px] tracking-wide font-semibold">{f.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic settings categories */}
            <div className="flex flex-col gap-5 border-t border-white/5 pt-5">
              {/* Preset Color Schemes (Applies to PDF & PNG) */}
              {(settings.format === 'pdf' || settings.format === 'png') && (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                    Print Design Preset
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        id: 'original',
                        name: 'Original Theme Colors',
                        desc: 'Preserves gorgeous dynamic gradient and dark background aesthetics.',
                        color: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                      },
                      {
                        id: 'ink-saver',
                        name: 'Ink Saver (High-Contrast)',
                        desc: 'Forces pure white background and charcoal text. Perfect for paper prints.',
                        color: 'bg-white border border-neutral-300'
                      },
                      {
                        id: 'monochromatic',
                        name: 'Monochromatic Grayscale',
                        desc: 'Render in crisp black, white, and full tonal grayscales.',
                        color: 'bg-gradient-to-r from-black to-neutral-400'
                      }
                    ].map((p) => {
                      const isSel = settings.preset === p.id
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSettings((s) => ({ ...s, preset: p.id as any }))}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all active:scale-[0.98] ${
                            isSel
                              ? 'border-[#e8ff57]/30 bg-[#e8ff57]/5'
                              : 'border-white/5 hover:border-white/10 bg-white/2'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex-none mt-0.5 ${p.color}`} />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span
                              className={`text-[11px] font-bold ${isSel ? 'text-white' : 'text-neutral-300'}`}
                            >
                              {p.name}
                            </span>
                            <span className="text-[9px] text-neutral-500 leading-normal">
                              {p.desc}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PDF setup parameters */}
              {settings.format === 'pdf' && (
                <>
                  {/* Page Layout Settings */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                      Page Booklet Setup
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-neutral-500 block mb-1">
                          Standard Size
                        </span>
                        <select
                          value={settings.pageSize}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, pageSize: e.target.value as any }))
                          }
                          className="w-full bg-[#161616] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20"
                        >
                          <option value="A4">A4 (Standard)</option>
                          <option value="Letter">US Letter</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] text-neutral-500 block mb-1">Orientation</span>
                        <select
                          value={settings.orientation}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, orientation: e.target.value as any }))
                          }
                          className="w-full bg-[#161616] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20"
                        >
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                        Booklet Margins
                      </label>
                      <span className="text-[10px] font-bold text-neutral-400 capitalize">
                        {settings.margins}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white/2 rounded-lg border border-white/5">
                      {['none', 'small', 'medium', 'large'].map((m) => {
                        const isSel = settings.margins === m
                        return (
                          <button
                            key={m}
                            onClick={() => setSettings((s) => ({ ...s, margins: m as any }))}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all capitalize cursor-pointer ${
                              isSel
                                ? 'bg-[#e8ff57] text-black shadow-md shadow-[#e8ff57]/5'
                                : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            {m}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* PNG setup parameters */}
              {settings.format === 'png' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                    PNG Render Resolution Scale
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/2 rounded-lg border border-white/5">
                    {[
                      { val: 1, label: '1x (Web)' },
                      { val: 2, label: '2x (HD)' },
                      { val: 3, label: '3x (300 DPI Print)' }
                    ].map((s) => {
                      const isSel = settings.pngScale === s.val
                      return (
                        <button
                          key={s.val}
                          onClick={() => setSettings((st) => ({ ...st, pngScale: s.val as any }))}
                          className={`py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#e8ff57] text-black shadow-md shadow-[#e8ff57]/10'
                              : 'text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Global Typography Overrides (Applies to PDF & PNG) */}
              {(settings.format === 'pdf' || settings.format === 'png') && (
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                    Global Font Overrides (WYSIWYG)
                  </label>
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-[9px] text-neutral-500 block mb-1">
                        Heading Typography
                      </span>
                      <select
                        value={settings.headingFont}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, headingFont: e.target.value }))
                        }
                        className="w-full bg-[#161616] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20"
                      >
                        {fontOptions.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block mb-1">
                        Body Text Typography
                      </span>
                      <select
                        value={settings.bodyFont}
                        onChange={(e) => setSettings((s) => ({ ...s, bodyFont: e.target.value }))}
                        className="w-full bg-[#161616] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20"
                      >
                        {fontOptions.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles (Toggles show up for PDF & PNG) */}
              <div className="flex flex-col gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                  Supplementary Content & Elements
                </label>
                <div className="flex flex-col gap-2 bg-white/2 rounded-xl p-3 border border-white/5">
                  {/* Speaker notes toggle (for pdf, png, pptx, md) */}
                  {settings.format !== 'html' && settings.format !== 'json' && (
                    <label className="flex items-center justify-between py-1.5 cursor-pointer">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-white">
                          Include Speaker Notes
                        </span>
                        <span className="text-[9px] text-neutral-500">
                          Renders presentation notes onto paper
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.includeSpeakerNotes}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, includeSpeakerNotes: e.target.checked }))
                        }
                        className="w-3.5 h-3.5 rounded border-white/10 bg-[#161616] text-[#e8ff57] focus:ring-0 focus:ring-offset-0 accent-[#e8ff57]"
                      />
                    </label>
                  )}

                  {/* Page numbering toggle (for pdf, png) */}
                  {(settings.format === 'pdf' || settings.format === 'png') && (
                    <label className="flex items-center justify-between py-1.5 border-t border-white/5 mt-1 pt-2.5 cursor-pointer">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-white">Page Numbering</span>
                        <span className="text-[9px] text-neutral-500">
                          Stamps page indices in bottom corners
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showPageNumbers}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, showPageNumbers: e.target.checked }))
                        }
                        className="w-3.5 h-3.5 rounded border-white/10 bg-[#161616] text-[#e8ff57] focus:ring-0 focus:ring-offset-0 accent-[#e8ff57]"
                      />
                    </label>
                  )}

                  {/* PowerPoint details */}
                  {settings.format === 'pptx' && (
                    <div className="text-[10px] text-neutral-500 leading-relaxed py-1.5">
                      📂 PPTX exports are built natively using shape coordinates. Background fills,
                      font definitions, and speaker slides map perfectly into Microsoft PowerPoint.
                    </div>
                  )}

                  {/* HTML details */}
                  {settings.format === 'html' && (
                    <div className="text-[10px] text-neutral-500 leading-relaxed py-1.5">
                      ⚡ Standalone HTML encapsulates the entire Reveal.js bundle, themes, and CSS
                      custom styling. You can open and present this directly inside any modern
                      browser without dependencies!
                    </div>
                  )}

                  {/* Markdown details */}
                  {settings.format === 'md' && (
                    <div className="text-[10px] text-neutral-500 leading-relaxed py-1.5">
                      📝 Markdown export extracts your slide titles, clear text bullet points, and
                      speaker notes directly into an elegant, standard, shareable document.
                    </div>
                  )}

                  {/* JSON details */}
                  {settings.format === 'json' && (
                    <div className="text-[10px] text-neutral-500 leading-relaxed py-1.5">
                      ⚙️ Raw JSON export compiles the entire slide presentation model (HTML nodes,
                      styling settings, speaker scripts) to a backup file for developers.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Glowing bottom Export Trigger button */}
          <div className="mt-auto p-6 border-t border-white/5 bg-[#0e0e0e] sticky bottom-0 z-10">
            <button
              onClick={handleExport}
              className="w-full py-3 rounded-xl bg-[#e8ff57] hover:bg-[#f3ff99] text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-[#e8ff57]/20 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group animate-pulse-slow"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              Export Presentation
            </button>
          </div>
        </div>

        {/* Right Side Booklet real-time preview canvas */}
        <div className="flex-1 bg-[#090909] overflow-y-auto custom-scrollbar p-8 relative flex flex-col items-center">
          {/* Section banner */}
          <div className="max-w-[720px] w-full flex items-center justify-between mb-6 px-1">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
              {settings.format === 'md'
                ? 'Live Markdown Document Outline'
                : settings.format === 'json'
                  ? 'Live Presentation JSON Schema'
                  : 'Live WYSIWYG Booklet Frame Grid'}
            </span>
            <span className="text-[9px] font-bold text-neutral-400">
              {settings.format === 'pdf' || settings.format === 'png' ? (
                <>
                  Preset: <span className="text-white uppercase font-bold">{settings.preset}</span>
                </>
              ) : (
                <span className="text-neutral-500">FORMAT OVERVIEW</span>
              )}
            </span>
          </div>

          {/* Content display depending on format */}
          {settings.format === 'md' ? (
            <div className="max-w-[720px] w-full bg-[#121212] border border-white/5 rounded-2xl p-8 pb-16 shadow-2xl font-serif text-neutral-300 select-text leading-relaxed animate-slide-up">
              <h1 className="text-3xl font-black mb-6 text-white border-b border-white/5 pb-4 font-sans tracking-tight">
                {presentation.title || 'Untitled Presentation'}
              </h1>
              {presentation.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="mb-8 border-b border-white/5 pb-6 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-xl font-bold text-white mb-3 font-sans">
                    Slide {index + 1}: {slide.title || 'Untitled Slide'}
                  </h2>
                  <div className="text-neutral-400 pl-4 border-l-2 border-neutral-700 font-sans text-sm leading-relaxed whitespace-pre-wrap mb-4">
                    {slide.html.replace(/<[^>]*>/g, '').trim()}
                  </div>
                  {settings.includeSpeakerNotes && slide.notes && (
                    <div className="bg-white/2 border border-white/5 rounded-xl p-4 text-xs font-sans mt-3">
                      <span className="text-[9px] font-black uppercase text-[#0047ff] block mb-1 tracking-widest">
                        Speaker Script Notes
                      </span>
                      <p className="text-neutral-400 italic">{slide.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : settings.format === 'json' ? (
            <div className="max-w-[720px] w-full bg-[#121212] border border-white/5 rounded-2xl p-6 shadow-2xl font-mono text-xs text-neutral-400 overflow-x-auto custom-scrollbar select-text animate-slide-up">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest font-sans">
                  Presentation Data Model
                </span>
                <span className="text-[9px] font-bold text-neutral-400 bg-white/5 px-2 py-0.5 rounded font-sans font-bold">
                  JSON
                </span>
              </div>
              <pre className="text-blue-400 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(
                  {
                    id: presentation.id,
                    title: presentation.title,
                    prompt: presentation.prompt,
                    theme: presentation.theme,
                    aspectRatio: presentation.aspectRatio,
                    createdAt: presentation.createdAt,
                    slides: presentation.slides.map((s) => ({
                      id: s.id,
                      index: s.index,
                      title: s.title,
                      slideType: s.slideType,
                      html: s.html,
                      notes: s.notes
                    }))
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            /* Booklet Slides List */
            <div className="max-w-[720px] w-full flex flex-col gap-8 pb-16">
              {presentation.slides.map((slide, index) => {
                // Custom compiler styling overrides specifically for this preview card iframe!
                const fontImport = (activeTheme as any).fontImport || ''

                // We compile the scoped HTML specifically for this preview
                // We enforce Ink Saver white backgrounds or standard theme backgrounds in preview!
                let previewBg = 'var(--og-slide-bg, #0d0d0d)'
                let previewText = 'var(--og-slide-text, #ffffff)'
                let previewAccent = 'var(--og-slide-accent, #38bdf8)'
                let extraStyleInject = ''

                if (settings.preset === 'ink-saver') {
                  previewBg = '#ffffff'
                  previewText = '#111111'
                  previewAccent = '#0047ff'
                  // Inject overrides to force dark text and white background inside iframe
                  extraStyleInject = `
                    html, body, .slide-wrapper, section {
                      background: #ffffff !important;
                      color: #111111 !important;
                    }
                    h1, h2, h3, p, li, strong, td, th {
                      color: #111111 !important;
                      background: none !important;
                      -webkit-text-fill-color: #111111 !important;
                      text-shadow: none !important;
                    }
                    .accent, strong {
                      color: #0047ff !important;
                    }
                    .cta-block {
                      background: #f3f4f6 !important;
                      color: #111111 !important;
                      border: 1px solid #e5e7eb !important;
                    }
                    table, th, td {
                      border-color: #e5e7eb !important;
                    }
                  `
                } else if (settings.preset === 'monochromatic') {
                  // We'll apply grayscale inside the body
                  extraStyleInject = `
                    html, body {
                      filter: grayscale(100%) !important;
                    }
                  `
                }

                // Apply Margins
                let marginPadding = '60px'
                if (settings.margins === 'none') marginPadding = '0px'
                else if (settings.margins === 'small') marginPadding = '30px'
                else if (settings.margins === 'medium') marginPadding = '60px'
                else if (settings.margins === 'large') marginPadding = '100px'

                // Apply global typography overrides
                let typographyStyles = `
                  pre, code {
                    font-family: 'JetBrains Mono', monospace !important;
                  }
                  strong, .number, .stat {
                    font-family: 'Space Grotesk', 'Outfit', sans-serif !important;
                    font-weight: 800 !important;
                  }
                `
                if (settings.headingFont !== 'original') {
                  typographyStyles += `
                    h1, h2, h3, .accent {
                      font-family: '${settings.headingFont}', sans-serif !important;
                    }
                  `
                } else {
                  typographyStyles += `
                    h1, h2, h3, .accent {
                      font-family: var(--og-slide-font-heading, 'Outfit'), sans-serif !important;
                    }
                  `
                }
                if (settings.bodyFont !== 'original') {
                  typographyStyles += `
                    p, li, td, th {
                      font-family: '${settings.bodyFont}', sans-serif !important;
                    }
                  `
                } else {
                  typographyStyles += `
                    p, li, td, th {
                      font-family: var(--og-slide-font-body, 'Inter'), sans-serif !important;
                    }
                  `
                }

                // Gather extra Google fonts imports if overrides are active
                let extraFontsImport = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');\n`
                if (
                  settings.headingFont !== 'original' &&
                  settings.headingFont !== 'Inter' &&
                  settings.headingFont !== 'Outfit' &&
                  settings.headingFont !== 'JetBrains Mono' &&
                  settings.headingFont !== 'Space Grotesk' &&
                  settings.headingFont !== 'Playfair Display'
                ) {
                  extraFontsImport += `@import url('https://fonts.googleapis.com/css2?family=${settings.headingFont.replace(/\s+/g, '+')}:wght@700;800&display=swap');\n`
                }
                if (
                  settings.bodyFont !== 'original' &&
                  settings.bodyFont !== 'Inter' &&
                  settings.bodyFont !== 'Outfit' &&
                  settings.bodyFont !== 'JetBrains Mono' &&
                  settings.bodyFont !== 'Space Grotesk' &&
                  settings.bodyFont !== 'Playfair Display'
                ) {
                  extraFontsImport += `@import url('https://fonts.googleapis.com/css2?family=${settings.bodyFont.replace(/\s+/g, '+')}:wght@400;600&display=swap');\n`
                }

                const srcDoc = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>
                        ${fontImport}
                        ${extraFontsImport}
                        ${activeTheme.cssTokens}
                        html, body {
                          width: 1280px;
                          height: 720px;
                          margin: 0;
                          padding: 0;
                          overflow: hidden;
                          box-sizing: border-box;
                          background: ${previewBg};
                          color: ${previewText};
                        }
                        .slide-wrapper {
                          width: 1280px;
                          height: 720px;
                          display: flex;
                      padding: ${marginPadding};
                          box-sizing: border-box;
                          text-align: center;
                        }
                        h1, h2, h3 {
                          font-family: var(--og-slide-font-heading, sans-serif);
                          color: ${previewText};
                          margin-top: 0;
                        }
                        p, li {
                          font-family: var(--og-slide-font-body, sans-serif);
                          font-size: 28px;
                          line-height: 1.5;
                        }
                        .accent, strong {
                          color: ${previewAccent} !important;
                        }
                        
                        /* Creative layout elements style overrides */
                        .cols {
                          display: grid !important;
                          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
                          gap: 30px !important;
                          align-items: stretch !important;
                          width: 100% !important;
                          margin-top: 25px !important;
                          text-align: left;
                        }
                        .col {
                          display: flex !important;
                          flex-direction: column !important;
                          justify-content: flex-start !important;
                        }
                        .card {
                          background: rgba(255, 255, 255, 0.03) !important;
                          border: 1px solid rgba(255, 255, 255, 0.08) !important;
                          border-radius: 12px !important;
                          padding: 24px !important;
                          box-sizing: border-box !important;
                          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
                          text-align: left !important;
                          width: 100%;
                        }
                        .card h3 {
                          margin-top: 0 !important;
                          margin-bottom: 12px !important;
                          font-size: 1.25em !important;
                        }
                        .card p {
                          margin: 0 !important;
                          font-size: 0.9em !important;
                          line-height: 1.5 !important;
                        }
                        .stat-block {
                          display: flex !important;
                          flex-direction: column !important;
                          align-items: center !important;
                          text-align: center !important;
                          padding: 20px !important;
                          background: rgba(255, 255, 255, 0.02) !important;
                          border: 1px solid rgba(255, 255, 255, 0.06) !important;
                          border-radius: 12px !important;
                          box-sizing: border-box !important;
                          width: 100%;
                        }
                        .stat-number {
                          font-size: 3.4em !important;
                          font-weight: 900 !important;
                          line-height: 1 !important;
                          color: ${previewAccent} !important;
                          margin-bottom: 8px !important;
                          text-shadow: 0 0 15px rgba(232, 255, 87, 0.15) !important;
                        }
                        .stat-label {
                          font-size: 0.8em !important;
                          font-weight: 700 !important;
                          color: ${previewText} !important;
                          opacity: 0.8 !important;
                          text-transform: uppercase !important;
                          letter-spacing: 0.1em !important;
                        }
                        .quote-block {
                          border-left: 4px solid ${previewAccent} !important;
                          padding-left: 24px !important;
                          text-align: left !important;
                          margin: 30px auto !important;
                          max-width: 85% !important;
                          font-style: italic !important;
                          box-sizing: border-box !important;
                        }
                        .quote-text {
                          font-size: 1.3em !important;
                          line-height: 1.4 !important;
                          font-weight: 500 !important;
                          margin-bottom: 12px !important;
                          color: ${previewText} !important;
                        }
                        .quote-author {
                          font-size: 0.85em !important;
                          font-weight: 700 !important;
                          text-transform: uppercase !important;
                          color: var(--og-slide-muted, #9ca3af) !important;
                          font-style: normal !important;
                          letter-spacing: 0.08em !important;
                        }
                        .badge {
                          display: inline-block !important;
                          background: rgba(232, 255, 87, 0.1) !important;
                          border: 1px solid rgba(232, 255, 87, 0.2) !important;
                          color: ${previewAccent} !important;
                          padding: 5px 14px !important;
                          border-radius: 9999px !important;
                          font-size: 0.7em !important;
                          font-weight: 800 !important;
                          text-transform: uppercase !important;
                          letter-spacing: 0.12em !important;
                          margin-bottom: 20px !important;
                        }
                        
                        section {
                          width: 100%;
                          height: 100%;
                          justify-content: center;
                          align-items: center;
                        }
                        ${typographyStyles}
                        ${extraStyleInject}
                      </style>
                    </head>
                    <body>
                      <div class="slide-wrapper">
                        ${slide.html}
                      </div>
                    </body>
                  </html>
                `

                return (
                  <div
                    key={slide.id}
                    className="flex flex-col gap-2.5 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Aspect Card wrapper */}
                    <div
                      className={`w-full relative rounded-xl border border-white/5 shadow-2xl overflow-hidden bg-[#121212] ${cardAspectRatio}`}
                      style={{
                        // --pdf-preview-scale maps the 1280-wide iframe into the container.
                        // The container max-width from the parent scroll area is ~680px effective.
                        // We use the same fraction the CSS aspect-ratio enforces: containerW/1280.
                        // For landscape 16:9 (A4): containerW ≈ 680px → 680/1280 ≈ 0.53
                        // CSS var is read by the iframe's transform: scale()
                        ['--pdf-preview-scale' as string]: isLandscape ? '0.5312' : '0.375'
                      }}
                    >
                      <iframe
                        srcDoc={srcDoc}
                        className="border-none select-none pointer-events-none absolute inset-0 w-full h-full"
                        style={{
                          // Render the iframe at 1280×720 internally but scale it down
                          // to fit the parent container without distortion.
                          // We use an SVG viewBox trick: set width/height via style so the
                          // browser scales the content, combined with aspect ratio on parent.
                          width: '1280px',
                          height: '720px',
                          transformOrigin: 'top left',
                          // The container has class `cardAspectRatio` so its width determines
                          // the visible area. We scale from 1280 → container width.
                          transform: 'scale(var(--pdf-preview-scale, 0.5625))'
                        }}
                        title={`Preview Booklet Slide ${index + 1}`}
                      />

                      {/* Dynamic Overlay Elements inside grid */}
                      <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-xl" />

                      {/* Slide number corner tag */}
                      {settings.showPageNumbers && (
                        <span className="absolute bottom-4 right-4 z-10 px-2 py-0.5 rounded bg-black/40 text-neutral-400 font-bold border border-white/5 text-[9px]">
                          Page {index + 1}
                        </span>
                      )}

                      {/* Slide badge index */}
                      <span className="absolute top-4 left-4 z-10 px-2 py-0.5 rounded bg-[#e8ff57] text-black font-black text-[9px] select-none shadow-md">
                        Slide {index + 1}
                      </span>
                    </div>

                    {/* Supplemental Speaker Notes print page layout (if enabled) */}
                    {settings.includeSpeakerNotes && slide.notes && (
                      <div className="p-4 rounded-xl border border-white/5 bg-white/2 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#e8ff57]">
                          <span>📝</span> Speaker Script notes (Page {index + 1} Supplement)
                        </div>
                        <div className="text-neutral-400 italic font-medium leading-relaxed font-sans pl-1">
                          {slide.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN GLASSMORPHIC EXPORTING DIALOG */}
      {exporting && (
        <div className="absolute inset-0 z-50 bg-[#0d0d0d]/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in no-drag">
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-8 max-w-[400px] w-full flex flex-col items-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />

            {/* Spinning load icon */}
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-[#e8ff57] border-t-transparent animate-spin" />
            </div>

            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">
              Generating Document
            </h3>
            <p className="text-[11px] font-semibold text-neutral-400 mb-6 text-center animate-pulse">
              {exportStage}
            </p>

            {/* Micro Progress bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#e8ff57] transition-all duration-300 rounded-full"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
              Progress: {exportProgress}%
            </span>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY PANEL */}
      {exportSuccess && (
        <div className="absolute inset-0 z-50 bg-[#0d0d0d]/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in no-drag">
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-8 max-w-[480px] w-full flex flex-col items-center shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-[#e8ff57]/10 border border-[#e8ff57]/20 text-[#e8ff57] text-2xl flex items-center justify-center mb-5 animate-scale-up font-bold">
              ✓
            </div>

            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">
              Export Complete!
            </h3>
            <p className="text-xs text-neutral-400 mb-4 max-w-[380px] leading-relaxed">
              Your presentation was successfully compiled and serialised to your chosen location.
            </p>

            {/* Path card */}
            <div className="w-full bg-[#181818] border border-white/5 rounded-xl p-3 mb-6 text-left flex items-start gap-3">
              <span className="text-xl mt-0.5">📂</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  Save Path
                </span>
                <span className="text-[10px] text-neutral-300 break-all font-mono select-text font-bold">
                  {exportSuccess}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleShowInFolder}
                className="flex-1 py-2.5 rounded-xl border border-white/5 bg-white/5 text-xs font-bold text-white hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                Show in Folder
              </button>
              <button
                onClick={() => setExportSuccess(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#e8ff57] hover:bg-[#f3ff99] text-xs font-black uppercase tracking-widest text-black active:scale-[0.98] transition-all cursor-pointer"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR OVERLAY PANEL */}
      {exportError && (
        <div className="absolute inset-0 z-50 bg-[#0d0d0d]/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in no-drag">
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-8 max-w-[420px] w-full flex flex-col items-center shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-2xl flex items-center justify-center mb-5 animate-scale-up">
              ⚠️
            </div>

            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">
              Export Failed
            </h3>
            <p className="text-xs text-red-400 mb-6 leading-relaxed bg-red-500/5 border border-red-500/10 rounded-xl p-3 w-full font-mono text-left max-h-[140px] overflow-y-auto">
              {exportError}
            </p>

            <button
              onClick={() => setExportError(null)}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-white active:scale-[0.98] transition-all cursor-pointer"
            >
              Dismiss & Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
