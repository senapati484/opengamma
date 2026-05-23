import React, { useState, useEffect, useRef } from 'react'
import type { Slide, SlideStyle, Theme } from '../types'
import { compileSlideHtml } from '../lib/slideCompiler'

export interface SlideEditModalProps {
  slide: Slide | null
  activeTheme: Theme
  isOpen: boolean
  onSave: (
    title: string,
    bullets: string[],
    notes: string,
    layout: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote',
    style: SlideStyle
  ) => void
  onClose: () => void
}

const HEADING_FONTS = [
  { name: 'Default Theme Font', value: '' },
  { name: 'Outfit (Sleek Geometric)', value: 'Outfit' },
  { name: 'Inter (Modern Clean)', value: 'Inter' },
  { name: 'Space Grotesk (Futuristic)', value: 'Space Grotesk' },
  { name: 'Playfair Display (Elegant Serif)', value: 'Playfair Display' },
  { name: 'Syne (Avant-Garde Bold)', value: 'Syne' },
  { name: 'Fredoka (Playful Rounded)', value: 'Fredoka' },
  { name: 'Sora (High-Tech Premium)', value: 'Sora' }
]

const BODY_FONTS = [
  { name: 'Default Theme Font', value: '' },
  { name: 'Inter (Highly Legible)', value: 'Inter' },
  { name: 'Roboto (Clean Standard)', value: 'Roboto' },
  { name: 'Atkinson Hyperlegible (Readability)', value: 'Atkinson Hyperlegible' },
  { name: 'JetBrains Mono (Technical Tech)', value: 'JetBrains Mono' },
  { name: 'Outfit (Modern Sans)', value: 'Outfit' },
  { name: 'Sora (Futuristic)', value: 'Sora' }
]

export const SlideEditModal: React.FC<SlideEditModalProps> = ({
  slide,
  activeTheme,
  isOpen,
  onSave,
  onClose
}) => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Form Fields State
  const [title, setTitle] = useState('')
  const [bulletsText, setBulletsText] = useState('')
  const [notes, setNotes] = useState('')
  const [accentText, setAccentText] = useState('')

  // Styling State
  const [layout, setLayout] = useState<'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote'>('content')
  const [titleSize, setTitleSize] = useState(1.0)
  const [contentSize, setContentSize] = useState(1.0)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [headingFont, setHeadingFont] = useState('')
  const [bodyFont, setBodyFont] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [textColor, setTextColor] = useState('')
  const [accentColor, setAccentColor] = useState('')

  // 1. Initialise form inputs from slide data
  useEffect(() => {
    if (!slide || !isOpen) return

    setTitle(slide.title || '')
    setNotes(slide.notes || '')
    setLayout(slide.slideType || 'content')

    // Style properties
    const s = slide.style || {}
    setTitleSize(s.titleSize || 1.0)
    setContentSize(s.contentSize || 1.0)
    setTextAlign(s.textAlign || (slide.slideType === 'title' ? 'center' : 'left'))
    setHeadingFont(s.headingFont || '')
    setBodyFont(s.bodyFont || '')
    setBgColor(s.bgColor || '')
    setTextColor(s.textColor || '')
    setAccentColor(s.accentColor || '')
    setAccentText(s.accentText || '')

    // Parse bullets from HTML if slide bullets are empty
    if (slide.bullets && slide.bullets.length > 0) {
      setBulletsText(slide.bullets.join('\n'))
    } else {
      const html = slide.html || ''
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const lis = doc.querySelectorAll('li')

      if (lis.length > 0) {
        const items = Array.from(lis).map((li) => li.textContent?.trim() || '')
        setBulletsText(items.join('\n'))
      } else {
        const matches = html.match(/<li>(.*?)<\/li>/g)
        if (matches) {
          const items = matches.map((m) => m.replace(/<\/?li>/g, '').trim())
          setBulletsText(items.join('\n'))
        } else {
          setBulletsText('')
        }
      }
    }
  }, [slide, isOpen])

  // Compile the current styling properties
  const currentStyle: SlideStyle = {
    titleSize,
    contentSize,
    textAlign,
    headingFont,
    bodyFont,
    bgColor: bgColor || undefined,
    textColor: textColor || undefined,
    accentColor: accentColor || undefined,
    accentText: accentText || undefined,
    layout
  }

  const getBulletsArray = (): string[] => {
    return bulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0)
  }

  // Compile full HTML using the slide compiler
  const compiledHtml = compileSlideHtml(
    title,
    getBulletsArray(),
    notes,
    layout,
    currentStyle,
    slide?.id
  )

  // 2. Sync visual customizer properties directly to live sandboxed Reveal preview frame
  useEffect(() => {
    const iframe = previewIframeRef.current
    if (!iframe || !iframeLoaded || !isOpen) return
    const contentWindow = iframe.contentWindow
    if (!contentWindow) return

    // Inject Theme Tokens first
    try {
      contentWindow.postMessage({ type: 'SET_THEME', cssTokens: activeTheme.cssTokens }, '*')
      if (activeTheme.revealTheme) {
        contentWindow.postMessage(
          { type: 'SET_REVEAL_THEME', themeName: activeTheme.revealTheme },
          '*'
        )
      }
    } catch (err) {
      console.warn('Iframe styling failed:', err)
    }

    // Set preview aspect ratio
    contentWindow.postMessage({ type: 'SET_ASPECT_RATIO', aspectRatio: '16:9' }, '*')

    // Clear slides and replace with the compiled WYSIWYG element
    contentWindow.postMessage({ type: 'CLEAR_SLIDES' }, '*')
    contentWindow.postMessage({ type: 'ADD_SLIDE', html: compiledHtml }, '*')
  }, [iframeLoaded, compiledHtml, isOpen, activeTheme])

  if (!isOpen || !slide) return null

  const handleSave = () => {
    onSave(title, getBulletsArray(), notes, layout, currentStyle)
  }

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-8 select-none no-drag">
      <div className="w-full h-full max-w-7xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-bounce">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#e8ff57]/10 text-[#e8ff57]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Visual Slide Designer</h3>
              <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                Customize content, layouts, typography, sizes, and alignments on Slide{' '}
                {slide.index + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Side-by-Side Main Container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          {/* LEFT: Designer Options Panel (5 columns) */}
          <div className="lg:col-span-5 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#141414]">
            {/* 1. Layout Archetype Selector */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Slide Layout Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'title', label: 'Title', icon: 'M4 6h16M4 12h16M4 18h7' },
                  { key: 'content', label: 'Bullet', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                  {
                    key: 'split',
                    label: 'Split',
                    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m3-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2'
                  },
                  {
                    key: 'data',
                    label: 'Data',
                    icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                  },
                  { key: 'cta', label: 'CTA', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5' },
                  { key: 'image', label: 'Image', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { key: 'stat', label: 'Stat', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' },
                  { key: 'quote', label: 'Quote', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setLayout(item.key as any)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      layout === item.key
                        ? 'border-[#e8ff57] bg-[#e8ff57]/10 text-[#e8ff57] shadow-md shadow-[#e8ff57]/5'
                        : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mb-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={item.icon}
                      />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Core Text Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Slide Heading
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans"
                  placeholder="Enter main header text..."
                />
              </div>

              {(layout === 'title' || layout === 'cta') && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {layout === 'title' ? 'Subtitle / Tagline' : 'Call-To-Action Statement'}
                  </label>
                  <input
                    type="text"
                    value={accentText}
                    onChange={(e) => setAccentText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans"
                    placeholder={
                      layout === 'title'
                        ? 'Enter presentation subtitle...'
                        : 'Enter premium target tagline statement...'
                    }
                  />
                </div>
              )}

              {layout !== 'title' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {layout === 'data'
                        ? 'Table Rows (Pipe "|" Separated)'
                        : 'Bullet Points / Core Insights'}
                    </label>
                    <span className="text-[9px] text-neutral-500 font-medium">
                      {layout === 'data'
                        ? 'Metric Name | Value | Description'
                        : 'One item per line'}
                    </span>
                  </div>
                  <textarea
                    value={bulletsText}
                    onChange={(e) => setBulletsText(e.target.value)}
                    rows={layout === 'data' ? 4 : 6}
                    className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                    placeholder={
                      layout === 'data'
                        ? 'Users | 120,400 | +12% YoY\nRevenue | $450K | Target met\nRetention | 94.2% | High Growth'
                        : 'Enter bullet details, one per line...'
                    }
                  />
                </div>
              )}
            </div>

            {/* 3. Text Alignment & Sizes */}
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Text Alignment
                </label>
                <div className="flex rounded-lg bg-neutral-950 p-1 border border-white/5">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTextAlign(align)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                        textAlign === align
                          ? 'bg-[#e8ff57] text-black shadow'
                          : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Size Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Title Size
                  </span>
                  <span className="text-[10px] font-bold text-[#e8ff57]">
                    {titleSize.toFixed(1)}em
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={titleSize}
                  onChange={(e) => setTitleSize(parseFloat(e.target.value))}
                  className="w-full accent-[#e8ff57] h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Content Size Slider */}
              {layout !== 'data' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Content Size
                    </span>
                    <span className="text-[10px] font-bold text-[#e8ff57]">
                      {contentSize.toFixed(1)}em
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={contentSize}
                    onChange={(e) => setContentSize(parseFloat(e.target.value))}
                    className="w-full accent-[#e8ff57] h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 4. Typographic System */}
            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Typography Overrides
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                    Heading Font
                  </span>
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 cursor-pointer"
                  >
                    {HEADING_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                    Body Font
                  </span>
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-[#e8ff57]/30 cursor-pointer"
                  >
                    {BODY_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 5. Custom Color Selection */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Custom Styling Colors (Overrides)
              </label>
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-900/40 border border-white/5">
                <div className="space-y-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                    Background
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="color"
                      value={bgColor || '#0d0d0d'}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                    />
                    {bgColor && (
                      <button
                        onClick={() => setBgColor('')}
                        className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                    Text Color
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="color"
                      value={textColor || '#ede9e1'}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                    />
                    {textColor && (
                      <button
                        onClick={() => setTextColor('')}
                        className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                    Accent Color
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="color"
                      value={accentColor || '#e8ff57'}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0"
                    />
                    {accentColor && (
                      <button
                        onClick={() => setAccentColor('')}
                        className="text-[8px] text-neutral-400 hover:text-white bg-white/5 px-1 py-0.5 rounded cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Visual Sandboxed Screen (7 columns) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-[#0d0d0d] p-6 lg:p-8 min-h-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Editor WYSIWYG
              </span>
              <span className="text-[9px] text-neutral-500 font-medium">
                Updates automatically in 16:9 ratio
              </span>
            </div>

            {/* Scale aspect-ratio container for the preview iframe */}
            <div className="flex-1 flex items-center justify-center min-h-[300px] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative bg-[#090909]">
              <iframe
                ref={previewIframeRef}
                src="/reveal-host.html"
                onLoad={() => setIframeLoaded(true)}
                className="w-full h-full border-none outline-none bg-transparent"
                style={{ aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%' }}
                title="Live Slide Preview WYSIWYG"
              />
            </div>

            {/* Slide Presentation Scripts / Speaker Notes */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Speaker Notes / Presentation Script
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-[#e8ff57]/30 focus:ring-1 focus:ring-[#e8ff57]/20 transition-all font-sans resize-none custom-scrollbar"
                placeholder="Include speaker notes, speaking prompts, or full script to assist the presenter during delivery..."
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 bg-[#161616] border-t border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[11px] font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-white/5 transition-all select-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-[11px] font-bold text-black bg-gradient-to-r from-[#e8ff57] to-[#dfff3d] hover:opacity-95 active:scale-95 transition-all select-none cursor-pointer shadow-md shadow-[#e8ff57]/10"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SlideEditModal
