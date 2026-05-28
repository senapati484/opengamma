import React, { useState, useEffect, useRef } from 'react'
import type { AppSettings, GenerationConfig, Theme, Slide } from '../types'
import { themes } from '../lib/themes'

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

  return (
    <div className="w-[260px] h-full bg-[#141414] border-r border-white/5 flex flex-col overflow-hidden no-drag relative">
      {/* Header / Logo Area */}
      <div className="p-5 pb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-lg font-black text-white tracking-tighter">Open</span>
          <span className="text-lg font-black text-[#e8ff57] tracking-tighter">Gamma</span>
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {settings?.executionMode === 'local-cli' ? 'Local CLI' : 'API Mode'}
            </span>
          </div>
          <div className="text-[8px] font-black text-neutral-600 tracking-tighter">v1.0</div>
        </div>
      </div>

      {/* Creation & Studio Forms */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        {/* Presentation builder */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.2em] opacity-70">
            Presentation Builder
          </div>

          <div className="space-y-3.5">
            {/* Presentation Name */}
            <div className="space-y-1 group">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-[#e8ff57] transition-colors">
                Presentation Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Investor Deck"
                className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#e8ff57]/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none transition-all"
              />
            </div>

            {/* Design System Premium selection */}
            <div className="space-y-2 relative" ref={themeDropdownRef}>
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                Design System
              </label>

              {/* Active Visual Swatch card */}
              <div
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="p-3 bg-[#1c1c1c] border border-white/5 hover:border-white/10 rounded-xl flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#e8ff57] transition-colors">
                    {selectedTheme.name}
                  </span>

                  {/* Swatch palette dots */}
                  <div className="flex gap-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.primary }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.accent }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: selectedTheme.colors.bg }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-neutral-500 leading-normal line-clamp-1 font-medium">
                  {selectedTheme.description}
                </p>
              </div>

              {/* Browse Button */}
              <button
                type="button"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="w-full py-2 bg-white/5 border border-white/5 text-neutral-300 hover:text-white hover:bg-[#e8ff57]/10 hover:border-[#e8ff57]/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <span>🎨</span> {showThemeDropdown ? 'Close Picker' : 'Browse Design Systems'}
              </button>

              {/* Custom Inline Dropdown list with design references */}
              {showThemeDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161616]/98 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex flex-col gap-2.5 w-full shadow-[0_15px_30px_rgba(0,0,0,0.6)] animate-fade-in">
                  {/* Dropdown Search Bar */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Search design systems..."
                      value={themeSearchQuery}
                      onChange={(e) => setThemeSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-[10px] rounded-lg bg-[#222] border border-white/5 text-white placeholder:text-neutral-500 outline-none focus:border-[#e8ff57]/30 transition-all shadow-inner"
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
                          className={`group/item p-2 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all select-none hover:bg-white/5 ${
                            isSelected
                              ? 'bg-[#e8ff57]/5 border-[#e8ff57]/20 shadow-sm shadow-[#e8ff57]/5'
                              : 'bg-transparent border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-white group-hover/item:text-[#e8ff57] transition-colors">
                              {theme.name}
                            </span>
                            <div className="flex gap-1.5 items-center">
                              {/* Swatch dots */}
                              <div className="flex gap-0.5">
                                <div
                                  className="w-2 h-2 rounded-full border border-white/10"
                                  style={{ backgroundColor: theme.colors.primary }}
                                  title="Primary"
                                />
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm"
                                  style={{ backgroundColor: theme.colors.accent }}
                                  title="Accent"
                                />
                                <div
                                  className="w-2 h-2 rounded-full border border-white/10"
                                  style={{ backgroundColor: theme.colors.bg }}
                                  title="Background"
                                />
                              </div>
                              {isSelected && (
                                <span className="text-[#e8ff57] text-[10px] font-bold">✓</span>
                              )}
                            </div>
                          </div>

                          <p className="text-[9px] text-neutral-400 leading-normal font-medium">
                            {theme.description}
                          </p>
                        </div>
                      )
                    })}

                    {filteredThemes.length === 0 && (
                      <div className="text-center py-4 text-[10px] text-neutral-500 font-bold">
                        No themes found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Slide Count Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Slides
                </label>
                <span className="text-[10px] font-bold text-[#e8ff57]">{slideCount}</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="w-full h-1 bg-[#222] rounded-full appearance-none accent-[#e8ff57] cursor-pointer outline-none"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
                {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 text-[9px] font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                      aspectRatio === ratio
                        ? 'bg-[#e8ff57] text-black shadow-lg shadow-[#e8ff57]/10'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {ratio === '16:9' && (
                      <div
                        className={`w-3.5 h-2 rounded-sm border ${aspectRatio === ratio ? 'border-black' : 'border-neutral-500'} bg-transparent`}
                      />
                    )}
                    {ratio === '9:16' && (
                      <div
                        className={`w-2 h-3.5 rounded-sm border ${aspectRatio === ratio ? 'border-black' : 'border-neutral-500'} bg-transparent`}
                      />
                    )}
                    {ratio === '1:1' && (
                      <div
                        className={`w-2.5 h-2.5 rounded-sm border ${aspectRatio === ratio ? 'border-black' : 'border-neutral-500'} bg-transparent`}
                      />
                    )}
                    <span>{ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Area */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                Describe your vision
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste outline or outline a topic..."
                className="w-full h-24 bg-[#1a1a1a] border border-white/5 focus:border-[#e8ff57]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none resize-none transition-all custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* AI Media Studio */}
        <div className="space-y-4 pt-1.5 border-t border-white/5">
          <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.2em] opacity-70">
            AI Media Studio
          </div>

          <div className="space-y-3">
            {/* Auto Generate Toggle */}
            <div className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  AI Images
                </span>
                <span className="text-[8px] text-neutral-500 font-semibold leading-tight">
                  Auto-generate & embed
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoGenerateImages((prev) => !prev)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 outline-none ${
                  autoGenerateImages ? 'bg-[#e8ff57]' : 'bg-[#2a2a2a]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-all duration-300 transform ${
                    autoGenerateImages ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI Voiceover Toggle */}
            <div className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  AI Voiceover
                </span>
                <span className="text-[8px] text-neutral-500 font-semibold leading-tight">
                  Narration based on notes
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoGenerateVoiceover((prev) => !prev)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 outline-none ${
                  autoGenerateVoiceover ? 'bg-[#e8ff57]' : 'bg-[#2a2a2a]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-all duration-300 transform ${
                    autoGenerateVoiceover ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI Background Music Toggle hidden */}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2.5 space-y-3">
          {isGenerating ? (
            <button
              onClick={onCancel}
              className="w-full h-11 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 active:scale-[0.98] transition-all"
            >
              Cancel Generation
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full h-11 bg-[#e8ff57] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,255,87,0.2)] active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-[#e8ff57]/5"
            >
              + Generate Deck
            </button>
          )}

          <button
            onClick={onImport}
            className="w-full h-11 bg-white/5 border border-white/5 text-neutral-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
          >
            ↑ Import Slides
          </button>
        </div>
      </div>

      {/* Bottom Nav Footer */}
      <div className="p-4 bg-[#0d0d0d] border-t border-white/5 flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        <button
          onClick={onOpenHelp}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
          title="Help & Shortcuts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <div className="text-[9px] font-black text-neutral-700 uppercase tracking-tighter pointer-events-none select-none pr-1">
          Open Gamma v1.0
        </div>
      </div>
    </div>
  )
}
