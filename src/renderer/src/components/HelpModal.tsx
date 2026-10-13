import React from 'react'
// @ts-ignore - package.json is outside the web tsconfig rootDir, but Vite bundles it successfully at runtime
import packageJson from '../../../../package.json'

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
      step: 'Step 1',
      title: 'Choose a Design System',
      desc: 'Select a curated theme with tuned color palettes, dynamic geometric styling, and modern typography tokens.'
    },
    {
      step: 'Step 2',
      title: 'Describe Your Vision',
      desc: 'Enter an outline or short prompt. OpenGamma drafts a structured, balanced presentation deck.'
    },
    {
      step: 'Step 3',
      title: 'Visual Layout Editor',
      desc: 'Select any slide to adjust layout templates (title, cards, split, quote, timeline, blank), edit copy, or regenerate slides.'
    },
    {
      step: 'Step 4',
      title: 'Vector PDF & Multi-Format Export',
      desc: 'Export directly to crisp vector-rendered PDF with native geometry, PowerPoint (.pptx), or standalone HTML.'
    }
  ]

  const shortcuts = [
    { keys: ['⌘ / Ctrl', 'Enter'], action: 'Generate presentation / submit outline' },
    { keys: ['⌘ / Ctrl', 'E'], action: 'Export presentation to PDF / PPTX' },
    { keys: ['⌘ / Ctrl', 'S'], action: 'Save current slide editing changes' },
    { keys: ['⌘ / Ctrl', ','], action: 'Open application settings panel' },
    { keys: ['Escape'], action: 'Close modal / cancel active generation' },
    { keys: ['Left', 'Right'], action: 'Navigate slide history' },
    { keys: ['⌘ / Ctrl', 'Z'], action: 'Undo last slide edit' }
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
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                Learn how to maximize your presentation workflow in OpenGamma
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
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-[#e8ff57] bg-[#e8ff57]/10 px-2 py-0.5 rounded-full border border-[#e8ff57]/20 select-none">
                      {step.step}
                    </span>
                    <h4 className="text-xs font-bold text-white tracking-wide">{step.title}</h4>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed font-normal">
                    {step.desc}
                  </p>
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
              <div className="grid grid-cols-3 p-3 bg-white/5 border-b border-white/5 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
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
              <svg className="w-3.5 h-3.5 text-[#e8ff57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Local-First & Open Source Alternative
              </h4>
              <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                OpenGamma runs completely locally with SQLite and native vector PDF rendering.
                Your data remains fully secure on your hard drive, allowing zero-latency custom
                modifications and private presentations without expensive cloud subscription gates.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d0d0d] border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-bold tracking-widest uppercase">
          <span>OpenGamma v{packageJson.version}</span>
          <span>
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[9px]">
              ESC
            </kbd>{' '}
            to Close
          </span>
        </div>
      </div>
    </div>
  )
}
