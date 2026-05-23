import React, { useState, useEffect, useRef } from 'react'
import type { GenerationConfig, Theme } from '../types'
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
  /** Optional value to control the prompt text from the parent */
  value?: string
  /** Callback triggered when the prompt text changes */
  onChange?: (val: string) => void
  /** Whether the input is in read-only mode */
  readOnly?: boolean
  /** Slide count state lifted to parent */
  slideCount?: number
  /** Slide count state setter lifted to parent */
  setSlideCount?: (count: number) => void
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onGenerate,
  isGenerating,
  onCancel,
  activeTheme,
  value,
  onChange,
  readOnly = false,
  slideCount: slideCountProp,
  setSlideCount: setSlideCountProp
}) => {
  const [localPrompt, setLocalPrompt] = useState('')
  const isControlled = value !== undefined
  const prompt = isControlled ? value : localPrompt
  const setPrompt = isControlled ? onChange || (() => {}) : setLocalPrompt

  const [localSlideCount, setLocalSlideCount] = useState(8)
  const slideCount = slideCountProp !== undefined ? slideCountProp : localSlideCount
  const setSlideCount = setSlideCountProp !== undefined ? setSlideCountProp : setLocalSlideCount

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [prompt])

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
      slideCount
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.stopPropagation()
      if (!readOnly) {
        handleSubmit()
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 no-drag"
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 550))}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          readOnly={readOnly}
          placeholder="Describe your presentation… e.g. 'Why our B2B SaaS beats competitors, 8 slides'"
          rows={1}
          className={`w-full bg-transparent text-neutral-800 placeholder-neutral-400 border-none outline-none focus:ring-0 resize-none text-base leading-relaxed disabled:opacity-50 transition-opacity ${
            readOnly ? 'cursor-not-allowed opacity-70' : ''
          }`}
          style={{ minHeight: '40px' }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-neutral-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 select-none">Slides:</span>
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
              disabled={isGenerating || readOnly}
              className="w-14 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#e8ff57]/30 text-center transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {isGenerating ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-100 transform active:scale-[0.98] transition-all duration-200 select-none"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim() || readOnly}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-black bg-[#e8ff57] hover:bg-[#dfff3d] shadow-sm shadow-[#e8ff57]/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            Generate
          </button>
        )}
      </div>
    </form>
  )
}

export default PromptInput
