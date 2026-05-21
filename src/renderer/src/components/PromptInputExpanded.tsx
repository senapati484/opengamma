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
 * Modern input with tone/narrative selection, slide count, and formatting hints
 * Takes up bottom 120px of editor
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
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
    <div className="flex flex-col h-full bg-white border-t border-neutral-100 p-4 gap-4">
      <div className="flex flex-1 items-start gap-4">
        {/* Main textarea */}
        <div className="flex-1 flex flex-col min-h-0 relative group">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || readOnly}
            placeholder="Type your presentation topic or paste an outline..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-base font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-neutral-50 transition-all min-h-[80px]"
          />
          
          <div className="absolute bottom-3 right-4 flex items-center gap-4">
            {/* Slide count control - moved inside for cleaner look */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-neutral-100 shadow-sm">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Slides</label>
              <input
                type="range"
                min="3"
                max="15"
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                disabled={readOnly}
                className="w-16 h-1 rounded-full accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-blue-600 w-4 text-center">{slideCount}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 text-[10px] text-neutral-400 font-bold bg-neutral-50 px-2 py-1 rounded border border-neutral-100">
              <kbd>⌘</kbd> + <kbd>⏎</kbd>
            </div>
          </div>
        </div>

        {/* Generate / Action Button */}
        <div className="flex-none self-end pb-1">
          {isGenerating ? (
            <button
              onClick={onCancel}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95 border border-red-100"
              title="Cancel generation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={!value.trim() || readOnly}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:bg-neutral-200 disabled:shadow-none"
              title="Generate Slides"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
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
