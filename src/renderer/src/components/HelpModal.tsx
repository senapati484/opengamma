import React from 'react'

export interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const steps = [
    {
      num: '01',
      title: 'Choose a Design System',
      desc: 'Select a premium theme with carefully tuned color palettes, dynamic gradients, and modern typography tokens.'
    },
    {
      num: '02',
      title: 'Describe Your Vision',
      desc: 'Enter a presentation outline or simply type a short topic. Let the AI generator draft a complete multi-slide structure.'
    },
    {
      num: '03',
      title: 'Visual Booklet Editor',
      desc: 'Click any slide thumbnail to customize layouts (title, content, split grid, data metrics, CTA), adjust individual font sizes, select heading/body typography, alignment, or override colors.'
    },
    {
      num: '04',
      title: 'Multi-Format Export',
      desc: 'Head to the Export Studio to fine-tune layout alignments, print styling, and export into standard print-ready PDF, editable PowerPoint (.pptx), PNGs, or responsive HTML.'
    }
  ]

  const shortcuts = [
    { keys: ['⌘ / Ctrl', 'Enter'], action: 'Generate presentation / submit outline' },
    { keys: ['⌘ / Ctrl', 'E'], action: 'Open export panel' },
    { keys: ['⌘ / Ctrl', 'S'], action: 'Save current slide editing changes' },
    { keys: ['⌘ / Ctrl', ','], action: 'Open application settings panel' },
    { keys: ['Escape'], action: 'Close modal / cancel active generation' },
    { keys: ['←', '→'], action: 'Navigate slide history (when not editing text)' },
    { keys: ['⌘ / Ctrl', 'Z'], action: 'Undo last slide edit (when not editing text)' }
  ]

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="w-full max-w-3xl bg-[#141414] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transform scale-100 transition-all duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8ff57]/10 flex items-center justify-center border border-[#e8ff57]/20">
              <svg
                className="w-4 h-4 text-[#e8ff57]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Help & Keyboard Shortcuts
              </h2>
              <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                Learn how to maximize your presentation workflow in Open Gamma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all active:scale-95"
            title="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Section 1: How to Use */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8ff57] shadow-[0_0_8px_rgba(232,255,87,0.6)]" />
              Workflow Guide
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex gap-3 group"
                >
                  <span className="text-xs font-black text-[#e8ff57] opacity-60 group-hover:opacity-100 transition-opacity mt-0.5 select-none">
                    {step.num}
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white tracking-wide">{step.title}</h4>
                    <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Shortcuts */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8ff57] shadow-[0_0_8px_rgba(232,255,87,0.6)]" />
              Keyboard Shortcuts
            </h3>

            <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
              <div className="grid grid-cols-3 p-3 bg-white/5 border-b border-white/5 text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                <div className="col-span-1">Action</div>
                <div className="col-span-2 text-right">Shortcut Keys</div>
              </div>
              <div className="divide-y divide-white/5">
                {shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 items-center p-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="col-span-1 text-[11px] font-bold text-white tracking-wide">
                      {shortcut.action}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1.5">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-2 py-1 rounded bg-[#1e1e1e] border border-white/10 shadow-sm text-[9px] font-black text-neutral-300 uppercase tracking-wider select-none font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Open Source Note */}
          <div className="p-4 rounded-xl bg-[#e8ff57]/5 border border-[#e8ff57]/10 flex items-start gap-3.5">
            <div className="w-5 h-5 rounded bg-[#e8ff57]/10 flex items-center justify-center border border-[#e8ff57]/20 flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-black text-[#e8ff57] select-none">!</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Local-First & Open Source Alternative
              </h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                Open Gamma runs completely locally with SQLite and built-in CSS/Reveal.js tools.
                Your data remains fully secure on your hard drive, allowing zero-latency custom
                modifications and private presentations without expensive cloud subscription gates.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d0d0d] border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-600 font-bold tracking-widest uppercase">
          <span>Open Gamma v1.0</span>
          <span>
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 font-mono text-[9px]">
              ESC
            </kbd>{' '}
            to Close
          </span>
        </div>
      </div>
    </div>
  )
}
