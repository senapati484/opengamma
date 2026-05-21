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
          <label className="text-xs font-semibold text-neutral-700">Design System</label>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Reset filter
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`whitespace-nowrap px-2 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat === 'ecommerce' && '🛍️'}
              {cat === 'tech' && '⚙️'}
              {cat === 'cosmetics' && '💄'}
              {cat === 'travel' && '✈️'}
              {cat === 'airline' && '🛫'}
              {cat === 'media' && '📰'}
              {cat === 'lifestyle' && '🎨'}
              {cat === 'other' && '⭐'}
              {' '}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Systems grid - compact 2 col */}
        <div className="grid grid-cols-2 gap-2">
          {filteredSystems.map((system) => (
            <button
              key={system.id}
              onClick={() => onSelect(system)}
              className={`p-2 rounded-lg border-2 transition-all text-left ${
                selectedId === system.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-md flex-shrink-0 border border-neutral-200"
                  style={{ backgroundColor: system.brandColor }}
                  title={system.brandColor}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 truncate">{system.name}</p>
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
      <div>
        <h3 className="text-sm font-bold text-neutral-900 mb-3">Design Systems Library</h3>
        <p className="text-xs text-neutral-600 mb-3">
          Choose from 15+ curated design systems to automatically style your presentation
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search systems..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Systems grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredSystems.map((system) => (
          <button
            key={system.id}
            onClick={() => onSelect(system)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedId === system.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-neutral-200 hover:border-blue-300 bg-white hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-neutral-200 shadow-sm"
                style={{ backgroundColor: system.brandColor }}
                title={`Brand Color: ${system.brandColor}`}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-neutral-900">{system.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5 capitalize">{system.category}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{system.description}</p>
            {selectedId === system.id && (
              <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
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
            className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
