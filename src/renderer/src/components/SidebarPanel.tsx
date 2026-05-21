import React, { useState } from 'react'
import type { Slide, Theme, Presentation } from '../types'

interface SidebarPanelProps {
  slides: Slide[]
  activeSlideIndex: number
  onSelectSlide: (index: number) => void
  onEditSlide: (slide: Slide) => void
  onRegenerateSlide: (index: number) => void
  activeTheme: Theme
  presentations: Presentation[]
  activePresentationId: string | null
  onSelectPresentation: (id: string) => void
  regeneratingIndex?: number
}

/**
 * Left Sidebar Panel
 * - Slide thumbnails in vertical stack
 * - Quick access to recent presentations
 * - Slide counter badge
 */
export const SidebarPanel: React.FC<SidebarPanelProps> = ({
  slides,
  activeSlideIndex,
  onSelectSlide,
  onEditSlide,
  onRegenerateSlide,
  activeTheme,
  presentations,
  activePresentationId,
  onSelectPresentation,
  regeneratingIndex
}) => {
  const [expandedSection, setExpandedSection] = useState<'slides' | 'recent'>('slides')

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Slides section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-neutral-100">
        {/* Section header */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'slides' ? 'recent' : 'slides')}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
        >
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Slides ({slides.length})
          </span>
          <svg
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
              expandedSection === 'slides' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </button>

        {/* Slide thumbnails list */}
        {expandedSection === 'slides' && (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {slides.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">
                <p>No slides yet</p>
                <p className="mt-1">Generate a presentation to see slides here</p>
              </div>
            ) : (
              slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlide(index)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all group ${
                    activeSlideIndex === index
                      ? 'bg-blue-50 border border-blue-200'
                      : 'border border-transparent hover:bg-neutral-50'
                  }`}
                >
                  {/* Slide thumbnail mini preview */}
                  <div className="relative w-full aspect-video rounded-md overflow-hidden bg-neutral-100 mb-2 flex items-center justify-center">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundColor: activeTheme.colors.primary }}
                    />
                    <span className="relative text-[10px] font-bold text-neutral-400">
                      {index + 1}
                    </span>

                    {regeneratingIndex === index && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
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
                      </div>
                    )}
                  </div>

                  {/* Slide info */}
                  <p className="text-[11px] font-semibold text-neutral-800 line-clamp-2 leading-tight mb-1">
                    {slide.title || `Slide ${index + 1}`}
                  </p>
                  <p className="text-[9px] text-neutral-400 line-clamp-1">
                    {slide.bullets?.length || 0} bullet
                    {slide.bullets?.length !== 1 ? 's' : ''}
                  </p>

                  {/* Action buttons - show on hover */}
                  <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditSlide(slide)
                      }}
                      className="flex-1 px-2 py-1 rounded text-[9px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors"
                      title="Edit this slide"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRegenerateSlide(index)
                      }}
                      className="flex-1 px-2 py-1 rounded text-[9px] font-medium text-neutral-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Regenerate this slide"
                    >
                      <svg
                        className="w-3 h-3 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recent presentations section */}
      <div className="h-32 flex flex-col border-t border-neutral-100 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'recent' ? 'slides' : 'recent')}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100"
        >
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Recent
          </span>
          <svg
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
              expandedSection === 'recent' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </button>

        {/* Recent list */}
        {expandedSection === 'recent' && (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {presentations.length === 0 ? (
              <p className="text-[11px] text-neutral-400 text-center py-4">No presentations yet</p>
            ) : (
              presentations.slice(0, 5).map((pres) => (
                <button
                  key={pres.id}
                  onClick={() => onSelectPresentation(pres.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium truncate transition-colors ${
                    activePresentationId === pres.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title={pres.title}
                >
                  {pres.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SidebarPanel
