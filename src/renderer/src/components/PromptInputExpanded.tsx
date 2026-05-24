import React, { useRef, useEffect } from 'react'

interface PromptInputExpandedProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
  onCancel: () => void
  slideCount: number
  setSlideCount: (count: number) => void
  readOnly?: boolean
}

/**
 * Expanded Prompt Input Area
 * Simplified and made more visible for easier use.
 */
export const PromptInputExpanded: React.FC<PromptInputExpandedProps> = ({
  value,
  onChange,
  onGenerate,
  isGenerating,
  onCancel,
  slideCount,
  setSlideCount,
  readOnly = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isGenerating && value.trim()) {
        onGenerate()
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#141414] border-t border-white/5 p-4 gap-3">
      {/* Main textarea container */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating || readOnly}
          placeholder="What would you like to present? Type a topic or paste an outline..."
          className="w-full px-4 py-3 rounded-xl border border-white/5 bg-[#0d0d0d] text-base font-medium text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e8ff57]/20 focus:border-[#e8ff57]/30 resize-none disabled:opacity-50 transition-all min-h-[70px]"
        />
      </div>

      {/* Controls and Generate row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Slide count control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              Slides
            </span>
            <div className="flex items-center gap-3 bg-[#0d0d0d] px-3 py-1.5 rounded-lg border border-white/5">
              <input
                type="range"
                min="3"
                max="15"
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                disabled={readOnly}
                className="w-24 h-1.5 rounded-full accent-[#e8ff57] cursor-pointer"
              />
              <span className="text-sm font-black text-[#e8ff57] w-5 text-center">
                {slideCount}
              </span>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold bg-[#0d0d0d] px-2 py-1 rounded border border-white/5">
            <kbd className="text-xs">⌘</kbd>
            <span>+</span>
            <kbd className="text-xs">⏎</kbd>
            <span className="ml-1 uppercase tracking-tighter opacity-70">to send</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center">
          {isGenerating ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20 text-sm font-bold shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={!value.trim() || readOnly}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#e8ff57] to-[#dfff3d] text-black hover:opacity-95 transition-all active:scale-95 shadow-md shadow-[#e8ff57]/10 disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none text-sm font-black uppercase tracking-wider cursor-pointer"
            >
              Generate
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PromptInputExpanded
