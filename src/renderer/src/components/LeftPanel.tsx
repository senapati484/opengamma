import React, { useState, useEffect, useRef } from 'react'
import type { AppSettings, GenerationConfig, Theme, Slide } from '../types'
import { themes } from '../lib/themes'
// @ts-ignore - package.json is outside the web tsconfig rootDir, but Vite bundles it successfully at runtime
import packageJson from '../../../../package.json'

interface LeftPanelProps {
  onGenerate: (config: GenerationConfig) => void
  isGenerating: boolean
  onCancel: () => void
  settings: AppSettings | null
  onOpenSettings: () => void
  onOpenHelp: () => void
  onImport: () => void
  activeSlide: Slide | null
  onUpdateActiveSlideBullets: ((bullets: string[]) => void) | null
  activeTheme: Theme | null
  onUpdateTheme: (theme: Theme) => void
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  onGenerate,
  isGenerating,
  onCancel,
  settings,
  onOpenSettings,
  onOpenHelp,
  onImport,
  activeTheme,
  onUpdateTheme
}) => {
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [slideCount, setSlideCount] = useState(settings?.defaultSlideCount || 8)
  const [themeId, setThemeId] = useState(settings?.defaultTheme || 'startup-gradient')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')

  // Theme library dropdown state
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [themeSearchQuery, setThemeSearchQuery] = useState('')
  const themeDropdownRef = useRef<HTMLDivElement>(null)

  // AI Image Studio state
  const [autoGenerateImages, setAutoGenerateImages] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('og-auto-generate-images')
      return saved === 'true'
    } catch {
      return false
    }
  })

  const [autoGenerateVoiceover, setAutoGenerateVoiceover] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('og-auto-generate-voiceover')
      return saved === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    localStorage.setItem('og-auto-generate-images', String(autoGenerateImages))
  }, [autoGenerateImages])

  useEffect(() => {
    localStorage.setItem('og-auto-generate-voiceover', String(autoGenerateVoiceover))
  }, [autoGenerateVoiceover])

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  // Sync internal theme selection with changes from App.tsx/activeTheme
  useEffect(() => {
    if (activeTheme) {
      setThemeId(activeTheme.id)
    }
  }, [activeTheme])

  const handleGenerate = () => {
    if (!prompt.trim()) return
    const theme = themes.find((t) => t.id === themeId) || themes[0]
    const rawNarrative = settings?.defaultNarrative || 'explainer'
    const narrative =
      rawNarrative === 'pitch' ||
      rawNarrative === 'explainer' ||
      rawNarrative === 'report' ||
      rawNarrative === 'academic'
        ? rawNarrative
        : 'explainer'
    onGenerate({
      prompt: title ? `Title: ${title}\n\n${prompt}` : prompt,
      theme,
      narrative,
      slideCount,
      aspectRatio,
      generateImages: autoGenerateImages,
      generateVoiceover: autoGenerateVoiceover,
      generateBgMusic: false
    })
  }

  const selectedTheme = themes.find((t) => t.id === themeId) || themes[0]

  const filteredThemes = themes.filter(
    (theme) =>
      theme.name.toLowerCase().includes(themeSearchQuery.toLowerCase()) ||
      theme.description.toLowerCase().includes(themeSearchQuery.toLowerCase())
  )

  const handleSlideCountStep = (delta: number) => {
    setSlideCount((prev) => Math.min(24, Math.max(3, prev + delta)))
  }

  return (
    <aside className="w-[280px] h-full bg-[#141414] border-r border-white/10 flex flex-col overflow-hidden no-drag relative select-none">
      {/* Header / Logo Area */}
      <div className="p-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white tracking-tight">Open</span>
            <span className="text-base font-black text-[#e8ff57] tracking-tight">Gamma</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 font-semibold">
            v{packageJson.version}
          </div>
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#1a1a1a] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-semibold text-neutral-300 tracking-wider">
              {settings?.executionMode === 'local-cli' ? 'Local CLI Mode' : 'API Engine'}
            </span>
          </div>

          <button
            onClick={onOpenHelp}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 font-mono tracking-tight px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
            title="Press ? for shortcuts"
          >
            ⌘K
          </button>
        </div>
      </div>

      {/* Creation & Studio Forms */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Presentation builder */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.15em]">
              Presentation Builder
            </span>
          </div>

          <div className="space-y-3">
            {/* Presentation Name */}
            <div className="space-y-1">
              <label
                htmlFor="presentation-title-input"
                className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block"
              >
                Presentation Title
              </label>
              <div className="relative">
                <input
                  id="presentation-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Growth & Revenue Review"
                  className="w-full bg-[#1c1c1c] border border-white/10 hover:border-white/20 focus:border-[#e8ff57] focus:ring-1 focus:ring-[#e8ff57]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition-all"
                />
                {title.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTitle('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
                    title="Clear title"
                    aria-label="Clear title"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Design System Premium selection */}
            <div className="space-y-1.5 relative" ref={themeDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Design System
                </label>
                <span className="text-[9px] text-neutral-500 font-medium">
                  {themes.length} available
                </span>
              </div>

              {/* Active Visual Swatch Card Trigger */}
              <button
                type="button"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="w-full p-2.5 bg-[#1c1c1c] border border-white/10 hover:border-white/20 rounded-xl flex flex-col gap-1.5 text-left cursor-pointer transition-all hover:bg-[#202020] active:scale-[0.99] group shadow-sm focus-visible:border-[#e8ff57]"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white group-hover:text-[#e8ff57] transition-colors truncate pr-2">
                    {selectedTheme.name}
                  </span>

                  {/* Swatch palette dots */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.primary }}
                      title="Primary Color"
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.accent }}
                      title="Accent Color"
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.bg }}
                      title="Background Color"
                    />
                    <svg
                      className={`w-3.5 h-3.5 text-neutral-400 ml-1 transition-transform duration-200 ${
                        showThemeDropdown ? 'rotate-180 text-[#e8ff57]' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 leading-normal line-clamp-1 font-medium">
                  {selectedTheme.description}
                </p>
              </button>

              {/* Custom Inline Dropdown list with search */}
              {showThemeDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#181818] border border-white/15 rounded-xl p-2.5 flex flex-col gap-2 w-full shadow-2xl backdrop-blur-xl animate-scale-in">
                  {/* Dropdown Search Bar */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Search design systems..."
                      value={themeSearchQuery}
                      onChange={(e) => setThemeSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg bg-[#222] border border-white/10 text-white placeholder:text-neutral-500 outline-none focus:border-[#e8ff57] transition-all"
                      autoFocus
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {/* Scrollable list */}
                  <div className="overflow-y-auto pr-0.5 custom-scrollbar flex flex-col gap-1 max-h-56">
                    {filteredThemes.map((theme) => {
                      const isSelected = themeId === theme.id
                      return (
                        <div
                          key={theme.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setThemeId(theme.id)
                            onUpdateTheme(theme)
                            setShowThemeDropdown(false)
                            setThemeSearchQuery('')
                          }}
                          className={`p-2 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all select-none ${
                            isSelected
                              ? 'bg-[#e8ff57]/10 border-[#e8ff57]/40 shadow-sm'
                              : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-[#e8ff57] transition-colors">
                              {theme.name}
                            </span>
                            <div className="flex gap-1.5 items-center">
                              {/* Swatch dots */}
                              <div className="flex gap-0.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/10"
                                  style={{ backgroundColor: theme.colors.primary }}
                                />
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/10"
                                  style={{ backgroundColor: theme.colors.accent }}
                                />
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/10"
                                  style={{ backgroundColor: theme.colors.bg }}
                                />
                              </div>
                              {isSelected && (
                                <svg className="w-3.5 h-3.5 text-[#e8ff57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-neutral-400 leading-normal font-medium line-clamp-1">
                            {theme.description}
                          </p>
                        </div>
                      )
                    })}

                    {filteredThemes.length === 0 && (
                      <div className="text-center py-4 text-xs text-neutral-500 font-semibold">
                        No design systems found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Slide Count Stepper & Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Slide Count
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSlideCountStep(-1)}
                    disabled={slideCount <= 3}
                    className="w-5 h-5 rounded bg-[#202020] hover:bg-[#2a2a2a] disabled:opacity-30 text-neutral-300 font-bold text-xs flex items-center justify-center transition-colors"
                    title="Decrease slides"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-[#e8ff57] min-w-[20px] text-center">
                    {slideCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSlideCountStep(1)}
                    disabled={slideCount >= 24}
                    className="w-5 h-5 rounded bg-[#202020] hover:bg-[#2a2a2a] disabled:opacity-30 text-neutral-300 font-bold text-xs flex items-center justify-center transition-colors"
                    title="Increase slides"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={3}
                max={24}
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#1c1c1c] p-1 rounded-xl border border-white/10">
                {(['16:9', '9:16', '1:1'] as const).map((ratio) => {
                  const isSelected = aspectRatio === ratio
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 text-[10px] font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#e8ff57] text-black shadow-md shadow-[#e8ff57]/20 font-black'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {ratio === '16:9' && (
                        <div
                          className={`w-4 h-2.5 rounded-sm border ${
                            isSelected ? 'border-black' : 'border-neutral-400'
                          } bg-transparent`}
                        />
                      )}
                      {ratio === '9:16' && (
                        <div
                          className={`w-2.5 h-4 rounded-sm border ${
                            isSelected ? 'border-black' : 'border-neutral-400'
                          } bg-transparent`}
                        />
                      )}
                      {ratio === '1:1' && (
                        <div
                          className={`w-3 h-3 rounded-sm border ${
                            isSelected ? 'border-black' : 'border-neutral-400'
                          } bg-transparent`}
                        />
                      )}
                      <span>{ratio}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prompt Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="vision-prompt-textarea"
                  className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider"
                >
                  Describe Your Vision
                </label>
                {prompt.length > 0 && (
                  <span className="text-[9px] text-neutral-500 font-mono">
                    {prompt.length} chars
                  </span>
                )}
              </div>
              <textarea
                id="vision-prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter topic, outline, or key talking points. E.g. 'Series A deck explaining our developer platform architecture, market size, and business traction...'"
                rows={4}
                className="w-full bg-[#1c1c1c] border border-white/10 hover:border-white/20 focus:border-[#e8ff57] focus:ring-1 focus:ring-[#e8ff57]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none resize-none transition-all custom-scrollbar leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* AI Media Studio */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.15em]">
            AI Media Studio
          </div>

          <div className="space-y-2">
            {/* Auto Generate Images Toggle */}
            <div className="flex items-center justify-between bg-[#1c1c1c] p-2.5 rounded-xl border border-white/10">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-white tracking-wide">AI Visuals</span>
                <span className="text-[10px] text-neutral-400 font-medium">
                  Auto-generate thematic imagery
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoGenerateImages}
                onClick={() => setAutoGenerateImages((prev) => !prev)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center ${
                  autoGenerateImages ? 'bg-[#e8ff57]' : 'bg-[#333333]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black shadow-sm transition-transform duration-200 ${
                    autoGenerateImages ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI Voiceover Toggle */}
            <div className="flex items-center justify-between bg-[#1c1c1c] p-2.5 rounded-xl border border-white/10">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-white tracking-wide">AI Narration</span>
                <span className="text-[10px] text-neutral-400 font-medium">
                  Audio voiceovers from speaker notes
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoGenerateVoiceover}
                onClick={() => setAutoGenerateVoiceover((prev) => !prev)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center ${
                  autoGenerateVoiceover ? 'bg-[#e8ff57]' : 'bg-[#333333]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black shadow-sm transition-transform duration-200 ${
                    autoGenerateVoiceover ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 space-y-2">
          {isGenerating ? (
            <button
              onClick={onCancel}
              className="w-full h-10 bg-red-500/15 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              Cancel Generation
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full h-11 bg-[#e8ff57] text-black font-black rounded-xl text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-md shadow-[#e8ff57]/10 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Generate Presentation
            </button>
          )}

          <button
            onClick={onImport}
            className="w-full h-9 bg-white/5 border border-white/10 text-neutral-300 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Document
          </button>
        </div>
      </div>

      {/* Bottom Nav Footer */}
      <div className="p-3 bg-[#111111] border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
            title="Settings (⌘,)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
            title="Keyboard Shortcuts (?)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>

        <span className="text-[10px] text-neutral-500 font-semibold tracking-wide">
          OpenGamma Studio
        </span>
      </div>
    </aside>
  )
}
