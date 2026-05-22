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

interface ImageAsset {
  id: string
  name: string
  dataUrl: string
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  onGenerate,
  isGenerating,
  onCancel,
  settings,
  onOpenSettings,
  onOpenHelp,
  onImport,
  activeSlide,
  onUpdateActiveSlideBullets,
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [assets, setAssets] = useState<ImageAsset[]>(() => {
    try {
      const saved = localStorage.getItem('og-image-assets')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  // Context menu position for assets
  const [activeAssetMenu, setActiveAssetMenu] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)
  // Inline feedback for actions (like copies or insert)
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist assets list to localStorage
  useEffect(() => {
    localStorage.setItem('og-image-assets', JSON.stringify(assets))
  }, [assets])

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveAssetMenu(null)
    }
    window.addEventListener('click', handleGlobalClick)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
    }
  }, [])

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(e.target as Node)
      ) {
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
    onGenerate({
      prompt: title ? `Title: ${title}\n\n${prompt}` : prompt,
      theme,
      slideCount,
      aspectRatio
    })
  }

  const selectedTheme = themes.find((t) => t.id === themeId) || themes[0]

  const filteredThemes = themes.filter(
    (theme) =>
      theme.name.toLowerCase().includes(themeSearchQuery.toLowerCase()) ||
      theme.description.toLowerCase().includes(themeSearchQuery.toLowerCase())
  )

  // --- AI Image Studio Handlers ---

  const handleGenerateAIImage = async () => {
    setIsGeneratingImage(true)
    setImageError(null)

    // Build prompt automatically based on current context
    let generatedPrompt = ''
    let assetName = 'AI Image'

    if (activeSlide) {
      const slideTitle = activeSlide.title || ''
      const slideBullets = activeSlide.bullets || []
      const bulletText = slideBullets.length > 0 ? slideBullets[0] : ''
      const cleanBullet = bulletText.replace(/<[^>]*>/g, '').substring(0, 80).trim()

      if (slideTitle && cleanBullet) {
        generatedPrompt = `A professional visual representing: ${slideTitle} - ${cleanBullet}. Clean, modern corporate style illustration, minimalist vector art, premium design system aesthetics.`
      } else if (slideTitle) {
        generatedPrompt = `A professional graphic representation of: ${slideTitle}. Clean, minimalist corporate presentation design, vector illustration.`
      } else if (cleanBullet) {
        generatedPrompt = `A modern visual design depicting: ${cleanBullet}. Professional flat design style illustration.`
      }
      assetName = slideTitle.substring(0, 15) || 'Slide Visual'
    }

    if (!generatedPrompt && title.trim()) {
      generatedPrompt = `A corporate presentation slide visual for: ${title.trim()}. High-quality minimalist design system graphic, vector illustration.`
      assetName = title.trim().substring(0, 15)
    }

    if (!generatedPrompt && prompt.trim()) {
      const cleanText = prompt.trim().substring(0, 80).replace(/\n/g, ' ')
      generatedPrompt = `A slide visual representing: ${cleanText}. Modern flat vector graphic style.`
      assetName = cleanText.substring(0, 15)
    }

    // Ultimate fallback if nothing is entered
    if (!generatedPrompt) {
      generatedPrompt = 'Abstract modern tech background, minimalist vector art, glowing neon accents, clean geometric shapes'
      assetName = 'Abstract Tech'
    }

    try {
      const sanitizedPrompt = encodeURIComponent(generatedPrompt)
      const response = await fetch(
        `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=1024&height=768&nologo=true`
      )

      if (!response.ok) {
        throw new Error('Could not contact image service')
      }

      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64data = reader.result as string
        const newAsset: ImageAsset = {
          id: crypto.randomUUID(),
          name: assetName,
          dataUrl: base64data
        }
        setAssets((prev) => [newAsset, ...prev])
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      console.error(err)
      setImageError('Failed to generate image. Please try again.')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleTriggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64data = reader.result as string
      const newAsset: ImageAsset = {
        id: crypto.randomUUID(),
        name: file.name.substring(0, 15) || 'Upload',
        dataUrl: base64data
      }
      setAssets((prev) => [newAsset, ...prev])
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
    if (activeAssetMenu?.id === id) {
      setActiveAssetMenu(null)
    }
  }

  const handleThumbnailClick = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveAssetMenu({
      id: assetId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleInsertToSlide = (assetId: string) => {
    if (!activeSlide || !onUpdateActiveSlideBullets) return
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return

    const imgTag = `<img src="${asset.dataUrl}" style="max-height: 260px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 25px rgba(0,0,0,0.5); object-fit: contain;" />`
    const currentBullets = activeSlide.bullets || []

    onUpdateActiveSlideBullets([...currentBullets, imgTag])
    setActiveAssetMenu(null)

    // Visual notification
    setFeedbackMsg({ id: assetId, text: 'Inserted!' })
    setTimeout(() => setFeedbackMsg(null), 2000)
  }

  const handleCopyHTML = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return

    const imgTag = `<img src="${asset.dataUrl}" style="max-height: 260px; border-radius: 10px;" />`
    navigator.clipboard.writeText(imgTag)
    setActiveAssetMenu(null)

    setFeedbackMsg({ id: assetId, text: 'HTML Copied!' })
    setTimeout(() => setFeedbackMsg(null), 2000)
  }

  const handleCopyMarkdown = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return

    const mdTag = `![Image](${asset.dataUrl})`
    navigator.clipboard.writeText(mdTag)
    setActiveAssetMenu(null)

    setFeedbackMsg({ id: assetId, text: 'MD Copied!' })
    setTimeout(() => setFeedbackMsg(null), 2000)
  }

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

        {/* AI Image Studio */}
        <div className="space-y-4 pt-1.5 border-t border-white/5">
          <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.2em] opacity-70">
            AI Image Studio
          </div>

          <div className="space-y-3">
            {/* Buttons row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerateAIImage}
                disabled={isGeneratingImage}
                className="flex-1 py-2 bg-[#e8ff57] text-black font-black text-[10px] rounded-lg uppercase tracking-wider hover:shadow-[0_0_12px_rgba(232,255,87,0.15)] active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
              >
                {isGeneratingImage ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-black"
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
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Generate Image</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTriggerUpload}
                className="flex-1 py-2 bg-white/5 border border-white/5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>📤 Upload Image</span>
              </button>

              {/* Invisible file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLocalUpload}
                className="hidden"
              />
            </div>

            {imageError && (
              <p className="text-[10px] font-semibold text-red-500 bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10">
                {imageError}
              </p>
            )}

            {/* Asset Collection Swatch Gallery */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Loaded Assets
                </span>
                <span className="text-[8px] font-black text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded-md">
                  {assets.length} items
                </span>
              </div>

              {assets.length === 0 ? (
                <div className="text-center py-4 px-3 rounded-lg border border-dashed border-white/5 bg-white/[0.01]">
                  <p className="text-[9px] font-medium text-neutral-500 leading-normal">
                    No visual assets loaded. Generate an image above or upload local pictures to
                    start.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar align-start content-start">
                  {assets.map((asset) => {
                    const isSelectedFeedback = feedbackMsg?.id === asset.id

                    return (
                      <div
                        key={asset.id}
                        onClick={(e) => handleThumbnailClick(asset.id, e)}
                        className="relative group aspect-square rounded-lg border border-white/5 bg-neutral-900 cursor-pointer overflow-hidden transform hover:scale-[1.03] hover:border-[#e8ff57]/20 active:scale-[0.98] transition-all duration-200 select-none shadow-md"
                      >
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-75"
                        />

                        {/* Top-Right hover delete badge */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAsset(asset.id)
                          }}
                          className="absolute top-0.5 right-0.5 z-10 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                          title="Delete image asset"
                        >
                          <svg
                            className="w-2 h-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>

                        {/* Temporary copied/inserted overlay message */}
                        {isSelectedFeedback && (
                          <div className="absolute inset-0 bg-[#e8ff57]/90 z-20 flex items-center justify-center p-0.5 text-center">
                            <span className="text-[8px] font-black text-black leading-tight">
                              {feedbackMsg?.text}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
          OpenGamma v1.0
        </div>
      </div>

      {/* Floating micro glassmorphic Context Menu */}
      {activeAssetMenu && (
        <div
          className="fixed z-50 bg-[#161616]/95 backdrop-blur-lg border border-white/10 rounded-xl p-1.5 flex flex-col gap-1 w-36 shadow-[0_15px_30px_rgba(0,0,0,0.6)] animate-fade-in"
          style={{ top: activeAssetMenu.y, left: activeAssetMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleInsertToSlide(activeAssetMenu.id)}
            disabled={!activeSlide || !onUpdateActiveSlideBullets}
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg text-white hover:bg-[#e8ff57] hover:text-black disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center justify-between"
            title={
              !activeSlide
                ? 'Open editor view to insert'
                : 'Add directly into current slide bullets'
            }
          >
            <span>📥 Insert Slide</span>
          </button>

          <button
            onClick={() => handleCopyHTML(activeAssetMenu.id)}
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
          >
            📄 Copy HTML
          </button>

          <button
            onClick={() => handleCopyMarkdown(activeAssetMenu.id)}
            className="w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
          >
            📝 Copy MD
          </button>
        </div>
      )}
    </div>
  )
}
