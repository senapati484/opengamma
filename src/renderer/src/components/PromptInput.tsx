import React, { useState, useEffect, useRef } from 'react'
import type { GenerationConfig, Narrative, Theme } from '../types'
import { themes } from '../lib/themes'

export interface PromptInputProps {
  /** Callback triggered when the prompt is submitted to start generation */
  onGenerate: (config: GenerationConfig) => void
  /** State indicator representing if slide generation is actively running */
  isGenerating: boolean
  /** Callback triggered to cancel active slide generation */
  onCancel: () => void
  /** The currently selected design theme, used to dynamically skin buttons and compile final configs */
  activeTheme?: Theme
}

/**
 * The main input board and primary user control panel.
 * Contains a dynamic prompt text field that auto-sizes to fit, custom dropdown/numeric
 * settings, hotkey triggers (Ctrl/Cmd + Enter), cost control checks, and styled submit
 * gradients dynamically adapting to the selected theme palette.
 */
export const PromptInput: React.FC<PromptInputProps> = ({
  onGenerate,
  isGenerating,
  onCancel,
  activeTheme
}) => {
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [narrative, setNarrative] = useState<Narrative>('explainer')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. Auto-focus textarea on initial load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // 2. Auto-resize height of prompt input box (max height cap around 120px)
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [prompt])

  // Resolve the current design theme (falls back gracefully to startup theme if undefined)
  const themeToUse = activeTheme || themes[0]

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (isGenerating) {
      onCancel()
      return
    }

    if (!prompt.trim()) return

    onGenerate({
      prompt: prompt.trim(),
      theme: themeToUse,
      slideCount,
      narrative
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Intercept Cmd+Enter / Ctrl+Enter shortcuts to start generation
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const characterCount = prompt.length
  const isOverLimit = characterCount > 500

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full rounded-2xl border border-white/[0.07] bg-[#161616] p-5 shadow-2xl transition-all duration-300 no-drag"
    >
      {/* Interactive Text Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 550))} // Soft character truncation
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          placeholder="Describe your presentation... e.g. 'Why our B2B SaaS beats competitors, 8 slides, dark theme'"
          rows={1}
          className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 border-none outline-none focus:ring-0 resize-none text-base leading-relaxed disabled:opacity-50 transition-opacity"
          style={{ minHeight: '40px' }}
        />

        {/* Character Limit Badge */}
        <div className="absolute right-0 -bottom-1 flex items-center gap-1 text-[10px] font-semibold text-neutral-500 select-none">
          <span
            className={
              isOverLimit ? 'text-red-500 font-bold' : characterCount > 400 ? 'text-yellow-500' : ''
            }
          >
            {characterCount}
          </span>
          <span>/</span>
          <span>500</span>
        </div>
      </div>

      {/* Slide Controls & Submit Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4.5 border-t border-white/[0.04]">
        <div className="flex flex-wrap items-center gap-4.5">
          {/* Slide Count Input Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 select-none">Slides:</span>
            <input
              type="number"
              min={4}
              max={20}
              value={slideCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val)) {
                  setSlideCount(Math.max(4, Math.min(20, val)))
                }
              }}
              disabled={isGenerating}
              className="w-14 bg-[#0d0d0d] text-neutral-200 border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/20 text-center transition-colors disabled:opacity-50"
            />
          </div>

          {/* Narrative Profile Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 select-none">Narrative:</span>
            <select
              value={narrative}
              onChange={(e) => setNarrative(e.target.value as Narrative)}
              disabled={isGenerating}
              className="bg-[#0d0d0d] text-neutral-200 border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-white/20 cursor-pointer transition-colors disabled:opacity-50"
            >
              <option value="explainer">Explainer</option>
              <option value="pitch">VC Pitch Deck</option>
              <option value="report">Report</option>
              <option value="academic">Academic Paper</option>
            </select>
          </div>
        </div>

        {/* Generate / Cancel Active Buttons */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.35)] transform active:scale-[0.98] transition-all duration-300 select-none"
          >
            {/* Animated ping dot indicating cancellation option is ready */}
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim() || isOverLimit}
            className="flex items-center justify-center px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xl hover:shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 select-none"
            style={{
              background: `linear-gradient(135deg, ${themeToUse.colors.primary} 0%, ${themeToUse.colors.accent} 100%)`,
              boxShadow:
                prompt.trim() && !isOverLimit
                  ? `0 10px 20px -6px ${themeToUse.colors.accent}36`
                  : undefined
            }}
          >
            Generate
          </button>
        )}
      </div>
    </form>
  )
}

export default PromptInput
