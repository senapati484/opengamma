import React, { useState } from 'react'
import type { Theme } from '../types'
import { themes } from '../lib/themes'
import { DesignSystemPicker } from './DesignSystemPicker'
import type { DesignSystemMetadata } from '../types/designSystem'

interface RightPanelProps {
  /**
   * Theme management
   */
  activeTheme: Theme | null
  onThemeSelect: (theme: Theme) => void
  /**
   * Design system management
   */
  selectedDesignSystem: DesignSystemMetadata | null
  onDesignSystemSelect: (system: DesignSystemMetadata) => void
  /**
   * Export actions
   */
  onExportPptx: () => void
  onExportHtml: () => void
  isExporting: boolean
  /**
   * Can export or not
   */
  canExport: boolean
  /**
   * Toggle collapsed state
   */
  onClose?: () => void
}

/**
 * Right Collapsible Panel
 * - Theme selector (compact 3x3 grid)
 * - Design system quick picker
 * - Export options
 * - Presentation metadata
 */
export const RightPanel: React.FC<RightPanelProps> = ({
  activeTheme,
  onThemeSelect,
  selectedDesignSystem,
  onDesignSystemSelect,
  onExportPptx,
  onExportHtml,
  isExporting,
  canExport,
  onClose
}) => {
  const [expandedSection, setExpandedSection] = useState<'theme' | 'design' | 'export'>('export')

  const toggleSection = (section: 'theme' | 'design' | 'export') => {
    setExpandedSection(expandedSection === section ? 'export' : section)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with close button */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tools</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
            title="Collapse panel"
          >
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* EXPORT SECTION (Primary) */}
        <div className="border-b border-neutral-100">
          <button
            onClick={() => toggleSection('export')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
          >
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Export</span>
            <svg
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                expandedSection === 'export' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
            </svg>
          </button>

          {expandedSection === 'export' && (
            <div className="px-4 py-3 space-y-2 bg-neutral-50">
              <p className="text-[11px] text-neutral-600 mb-2">
                {canExport
                  ? 'Export your presentation in multiple formats'
                  : 'Generate a presentation first to export'}
              </p>

              {/* Export buttons */}
              <button
                onClick={onExportPptx}
                disabled={!canExport || isExporting}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-[11px] font-semibold text-neutral-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isExporting ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                <span>Export as PowerPoint</span>
              </button>

              <button
                onClick={onExportHtml}
                disabled={!canExport || isExporting}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-neutral-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-[11px] font-semibold text-neutral-700 hover:text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V9.75M3 12h18M3 6h18" />
                </svg>
                <span>Export as HTML</span>
              </button>
            </div>
          )}
        </div>

        {/* THEME SECTION */}
        <div className="border-b border-neutral-100">
          <button
            onClick={() => toggleSection('theme')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
          >
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Theme</span>
            <svg
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                expandedSection === 'theme' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
            </svg>
          </button>

          {expandedSection === 'theme' && (
            <div className="px-4 py-3 space-y-2 bg-neutral-50">
              <div className="grid grid-cols-3 gap-2">
                {themes.slice(0, 9).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeSelect(theme)}
                    className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                      activeTheme?.id === theme.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                    title={theme.name}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br" 
                         style={{
                           backgroundImage: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`
                         }}>
                      <span className="text-[9px] font-bold text-white drop-shadow-sm text-center px-1">
                        {theme.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <a
                href="#"
                className="text-[10px] text-blue-600 hover:underline font-medium"
              >
                View all themes →
              </a>
            </div>
          )}
        </div>

        {/* DESIGN SYSTEM SECTION */}
        <div className="border-b border-neutral-100 flex-1 overflow-hidden flex flex-col">
          <button
            onClick={() => toggleSection('design')}
            className="flex-shrink-0 w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
          >
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Design</span>
            <svg
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                expandedSection === 'design' ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
            </svg>
          </button>

          {expandedSection === 'design' && (
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-neutral-50">
              <DesignSystemPicker
                selectedId={selectedDesignSystem?.id}
                onSelect={onDesignSystemSelect}
                isCompact={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RightPanel
