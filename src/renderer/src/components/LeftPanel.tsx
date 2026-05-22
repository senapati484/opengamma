import React, { useState } from 'react'
import type { AppSettings, GenerationConfig } from '../types'
import { themes } from '../lib/themes'

interface LeftPanelProps {
  onGenerate: (config: GenerationConfig) => void
  isGenerating: boolean
  onCancel: () => void
  settings: AppSettings | null
  onOpenSettings: () => void
  onOpenHelp: () => void
  onImport: () => void
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  onGenerate,
  isGenerating,
  onCancel,
  settings,
  onOpenSettings,
  onOpenHelp,
  onImport
}) => {
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [slideCount, setSlideCount] = useState(settings?.defaultSlideCount || 8)
  const [themeId, setThemeId] = useState(settings?.defaultTheme || 'startup-gradient')

  const handleGenerate = () => {
    if (!prompt.trim()) return
    const theme = themes.find(t => t.id === themeId) || themes[0]
    onGenerate({
      prompt: title ? `Title: ${title}\n\n${prompt}` : prompt,
      theme,
      slideCount
    })
  }

  const selectedTheme = themes.find(t => t.id === themeId) || themes[0]

  return (
    <div className="w-[260px] h-full bg-[#141414] border-r border-white/5 flex flex-col overflow-hidden no-drag">
      
      {/* Header / Logo Area */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-lg font-black text-white tracking-tighter">Open</span>
          <span className="text-lg font-black text-[#e8ff57] tracking-tighter">Gamma</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/5 w-fit">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {settings?.executionMode === 'local-cli' ? 'Local CLI' : 'API Mode'}
          </span>
        </div>
      </div>

      {/* Creation Form */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div>
          <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-[0.2em] mb-4 opacity-70">New Presentation</div>
          
          <div className="space-y-4">
            {/* Presentation Name */}
            <div className="space-y-1.5 group">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-[#e8ff57] transition-colors">Presentation Name</label>
              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Q4 Investor Deck"
                className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#e8ff57]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-all"
              />
            </div>

            {/* Design System Picker (Compact Select) */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Design System</label>
              <div className="relative group">
                <select 
                  value={themeId}
                  onChange={e => setThemeId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/5 hover:border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs text-white appearance-none outline-none cursor-pointer transition-all"
                >
                  {themes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ backgroundColor: selectedTheme.colors.primary }} />
                  <span className="text-[10px] text-neutral-500 font-bold opacity-50">▾</span>
                </div>
              </div>
            </div>

            {/* Slide Count Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Slides</label>
                <span className="text-[10px] font-bold text-[#e8ff57]">{slideCount}</span>
              </div>
              <input 
                type="range"
                min={4}
                max={20}
                value={slideCount}
                onChange={e => setSlideCount(parseInt(e.target.value))}
                className="w-full h-1 bg-[#222] rounded-full appearance-none accent-[#e8ff57] cursor-pointer outline-none"
              />
            </div>

            {/* Prompt Area */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Describe your vision</label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Paste an outline or describe your topic in detail..."
                className="w-full h-32 bg-[#1a1a1a] border border-white/5 focus:border-[#e8ff57]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none resize-none transition-all custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 space-y-3">
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
              + Generate
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button 
          onClick={onOpenHelp}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
          title="Help & Shortcuts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <div className="text-[9px] font-black text-neutral-700 uppercase tracking-tighter pointer-events-none select-none pr-1">
          OpenGamma v1.0
        </div>
      </div>
    </div>
  )
}
