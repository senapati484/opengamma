import React, { useState, useEffect } from 'react'
import type { Slide } from '../types'

export interface SlideEditModalProps {
  slide: Slide | null
  isOpen: boolean
  onSave: (title: string, bullets: string[], notes: string) => void
  onClose: () => void
}

/**
 * SlideEditModal - Absolute Overlay Modal for slide content editing.
 * Avoids position:fixed to prevent iframe/electron layout glitches.
 * Provides inputs for Title, Bullets (one per line), and Speaker Notes.
 */
export const SlideEditModal: React.FC<SlideEditModalProps> = ({
  slide,
  isOpen,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('')
  const [bulletsText, setBulletsText] = useState('')
  const [notes, setNotes] = useState('')

  // Parse HTML lists when the active slide changes
  useEffect(() => {
    if (!slide) return

    setTitle(slide.title || '')
    setNotes(slide.notes || '')

    // Extract bullets from HTML using DOMParser with a regex fallback
    const html = slide.html || ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const lis = doc.querySelectorAll('li')

    if (lis.length > 0) {
      const items = Array.from(lis).map((li) => li.textContent?.trim() || '')
      setBulletsText(items.join('\n'))
    } else {
      // Regex fallback
      const matches = html.match(/<li>(.*?)<\/li>/g)
      if (matches) {
        const items = matches.map((m) => m.replace(/<\/?li>/g, '').trim())
        setBulletsText(items.join('\n'))
      } else {
        setBulletsText('')
      }
    }
  }, [slide, isOpen])

  if (!isOpen || !slide) return null

  const handleSave = () => {
    // Split bullets text by newline and filter out empty items
    const bullets = bulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0)

    onSave(title, bullets, notes)
  }

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none no-drag">
      <div className="w-full max-w-xl bg-[#161616] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90%] overflow-hidden animate-scale-bounce">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
            <h3 className="text-sm font-bold text-neutral-100">Edit Slide {slide.index + 1}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Fields */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Slide Title Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Slide Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition-all font-sans"
              placeholder="Enter slide title..."
            />
          </div>

          {/* Slide Bullets Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Bullet Points
              </label>
              <span className="text-[9px] text-neutral-500 font-medium">One bullet per line</span>
            </div>
            <textarea
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              rows={6}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition-all font-sans resize-y custom-scrollbar"
              placeholder="Enter bullet points, one per line..."
            />
          </div>

          {/* Speaker Notes Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Speaker Notes / Presentation script
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition-all font-sans resize-y custom-scrollbar"
              placeholder="Add speaker notes for this slide..."
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 bg-neutral-900/50 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[11px] font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-white/5 transition-all select-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4.5 py-2 rounded-xl text-[11px] font-bold text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-95 active:scale-95 transition-all select-none cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SlideEditModal
