import React, { useState, useMemo } from 'react'
import { CURATED_DESIGN_SYSTEMS } from '../types/designSystem'
import type { DesignSystemMetadata } from '../types/designSystem'

interface DesignSystemPickerProps {
  selectedId?: string
  onSelect: (system: DesignSystemMetadata) => void
  isCompact?: boolean
}

/**
 * Design System Picker Component
 * Allows users to browse and select from 15+ curated design systems
 * Each system includes brand colors, typography, and AI-friendly prompts
 */
export const DesignSystemPicker: React.FC<DesignSystemPickerProps> = ({
  selectedId,
  onSelect,
  isCompact = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(CURATED_DESIGN_SYSTEMS.map((s) => s.category))
    return Array.from(cats).sort()
  }, [])

  // Filter systems by search and category
  const filteredSystems = useMemo(() => {
    return CURATED_DESIGN_SYSTEMS.filter((system) => {
      const matchesSearch =
        searchQuery === '' ||
        system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        system.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === null || system.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  if (isCompact) {
    // Compact mode: horizontal scrollable list (for settings panel)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-400">Design System</label>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
          >
            Reset filter
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0 border ${
                selectedCategory === cat
                  ? 'bg-[#e8ff57]/10 text-[#e8ff57] border-[#e8ff57]/30'
                  : 'bg-white/5 text-neutral-400 border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat === 'ecommerce' && '🛍️ '}
              {cat === 'tech' && '⚙️ '}
              {cat === 'cosmetics' && '💄 '}
              {cat === 'travel' && '✈️ '}
              {cat === 'airline' && '🛫 '}
              {cat === 'media' && '📰 '}
              {cat === 'lifestyle' && '🎨 '}
              {cat === 'other' && '⭐ '}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Systems grid - compact 2 col */}
        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
          {filteredSystems.map((system) => (
            <button
              key={system.id}
              onClick={() => onSelect(system)}
              className={`p-2 rounded-xl border transition-all text-left ${
                selectedId === system.id
                  ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5'
                  : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-md flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: system.brandColor }}
                  title={system.brandColor}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{system.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{system.category}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredSystems.length === 0 && (
          <div className="text-center py-4 text-xs text-neutral-500">No systems found</div>
        )}
      </div>
    )
  }

  // Full mode: detailed panel with search and descriptions
  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search systems..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-[#141414] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50 focus:ring-1 focus:ring-[#e8ff57]/50 placeholder-neutral-500 transition-all"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              selectedCategory === cat
                ? 'bg-[#e8ff57]/10 text-[#e8ff57] border-[#e8ff57]/30 font-bold'
                : 'bg-white/5 text-neutral-400 border-white/5 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Systems grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {filteredSystems.map((system) => (
          <button
            key={system.id}
            onClick={() => onSelect(system)}
            className={`p-4 rounded-xl border transition-all text-left ${
              selectedId === system.id
                ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5 ring-1 ring-[#e8ff57]/20 shadow-lg shadow-[#e8ff57]/5'
                : 'border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 border border-white/10 shadow-md"
                style={{ backgroundColor: system.brandColor }}
                title={`Brand Color: ${system.brandColor}`}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-white">{system.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5 capitalize">{system.category}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">{system.description}</p>
            {selectedId === system.id && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#e8ff57] font-bold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Selected
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredSystems.length === 0 && (
        <div className="text-center py-8 text-sm text-neutral-500">
          <p>No design systems match your search</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory(null)
            }}
            className="text-xs text-[#e8ff57] hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
