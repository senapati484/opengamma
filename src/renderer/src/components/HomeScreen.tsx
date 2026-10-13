import React, { useState, useMemo } from 'react'
import type { Presentation } from '../types'
import { themes } from '../lib/themes'

interface TemplatePreset {
  id: string
  title: string
  subtitle: string
  prompt: string
  themeId: string
  narrative: 'pitch' | 'explainer' | 'report' | 'academic'
  badge: string
}

const STARTER_TEMPLATES: TemplatePreset[] = [
  {
    id: 'startup-pitch',
    title: 'Startup Pitch Deck',
    subtitle: 'Problem, market opportunity, solution, and growth metrics',
    prompt:
      'Seed round investor deck: Outline the critical market friction, our unique technical advantage, TAM/SAM/SOM breakdown, early traction metrics, and fundraising roadmap.',
    themeId: 'startup-gradient',
    narrative: 'pitch',
    badge: 'Investors'
  },
  {
    id: 'quarterly-review',
    title: 'Quarterly Business Review',
    subtitle: 'Revenue performance, OKR scorecard, and strategic priorities',
    prompt:
      'Q3 executive review: Performance analysis covering gross revenue targets, customer retention trends, product delivery highlights, and key operational OKRs for next quarter.',
    themeId: 'midnight-exec',
    narrative: 'report',
    badge: 'Executive'
  },
  {
    id: 'product-strategy',
    title: 'Product Strategy & Roadmap',
    subtitle: 'User personas, architectural vision, and rollout timeline',
    prompt:
      'Product strategy presentation: User problem statements, technical architecture overview, competitive differentiators, and phased feature release roadmap.',
    themeId: 'cyber-minimal',
    narrative: 'explainer',
    badge: 'Product'
  },
  {
    id: 'tech-architecture',
    title: 'Systems Architecture',
    subtitle: 'Distributed system design, data pipelines, and scalability',
    prompt:
      'Engineering architecture deep dive: Service boundaries, event-driven message bus, database replication strategy, fault tolerance, and observability patterns.',
    themeId: 'slate-clean',
    narrative: 'academic',
    badge: 'Engineering'
  }
]

interface HomeScreenProps {
  presentations: Presentation[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onExport: (pres: Presentation) => void
  onNew: () => void
  onSelectTemplate?: (template: TemplatePreset) => void
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  presentations,
  onOpen,
  onDelete,
  onExport,
  onSelectTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let list = presentations
    if (activeTab === 'recent') {
      list = list.slice(0, 6)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q))
    }
    return list
  }, [presentations, activeTab, searchQuery])

  return (
    <div className="flex-1 h-full bg-[#0d0d0d] flex flex-col overflow-hidden select-none">
      {/* Top Bar with Tabs and Quick Search */}
      <div className="flex items-center justify-between px-8 border-b border-white/10 h-[54px] bg-[#121212]/50 backdrop-blur-sm flex-none">
        <div className="flex items-center gap-2 h-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 h-full text-xs font-bold tracking-wide transition-all relative flex items-center gap-2 ${
              activeTab === 'all' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>All Decks</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'all' ? 'bg-[#e8ff57] text-black font-bold' : 'bg-white/10 text-neutral-400'
              }`}
            >
              {presentations.length}
            </span>
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8ff57]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 h-full text-xs font-bold tracking-wide transition-all relative flex items-center gap-2 ${
              activeTab === 'recent' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Recent</span>
            {activeTab === 'recent' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8ff57]" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1a1a1a] border border-white/10 focus:border-[#e8ff57] rounded-lg text-white placeholder:text-neutral-500 outline-none transition-all shadow-inner"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
        {/* Quick-Start Templates Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Quick-Start Templates
            </h2>
            <span className="text-[10px] text-neutral-400">
              One-click instant draft generation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STARTER_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => onSelectTemplate?.(tpl)}
                className="group p-4 bg-[#141414] border border-white/10 hover:border-[#e8ff57]/50 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#e8ff57]/5 flex flex-col justify-between gap-3 text-left"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#e8ff57] bg-[#e8ff57]/10 px-2 py-0.5 rounded-full border border-[#e8ff57]/20">
                      {tpl.badge}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold text-white group-hover:text-[#e8ff57] transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                    {tpl.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>8 slides</span>
                  <span className="text-neutral-300 group-hover:text-white font-bold transition-colors flex items-center gap-1">
                    <span>Build deck</span>
                    <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Presentations Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              {activeTab === 'recent' ? 'Recent Presentations' : 'All Presentations'}
            </h2>
            {filtered.length > 0 && (
              <span className="text-[10px] text-neutral-500 font-mono">
                {filtered.length} {filtered.length === 1 ? 'deck' : 'decks'}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 bg-[#121212]/40 rounded-2xl border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {searchQuery ? 'No matching decks found' : 'No presentations in this library yet'}
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? 'Try searching with a different term or clear the filter.'
                    : 'Pick a template above or describe your vision in the left panel to generate your first deck.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
              {filtered.map((pres) => {
                const theme = themes.find((t) => t.id === pres.theme) || themes[0]
                const date = new Date(pres.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })

                return (
                  <div
                    key={pres.id}
                    onClick={() => onOpen(pres.id)}
                    className="group relative flex flex-col bg-[#141414] border border-white/10 rounded-xl overflow-hidden hover:border-[#e8ff57]/40 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:shadow-[#e8ff57]/5 hover:-translate-y-0.5"
                  >
                    {/* Thumbnail Preview Area */}
                    <div
                      className="aspect-video w-full flex items-center justify-center p-5 relative overflow-hidden"
                      style={{ background: theme.colors.bg }}
                    >
                      <div className="text-center space-y-1.5 pointer-events-none px-4">
                        <div
                          className="text-[11px] font-black tracking-tight line-clamp-2"
                          style={{ color: theme.colors.primary }}
                        >
                          {pres.title}
                        </div>
                        <div className="flex flex-col gap-1 items-center opacity-40">
                          <div
                            className="w-12 h-0.5 rounded-full"
                            style={{ backgroundColor: theme.colors.text }}
                          />
                          <div
                            className="w-8 h-0.5 rounded-full"
                            style={{ backgroundColor: theme.colors.text }}
                          />
                        </div>
                      </div>

                      {/* Hover Actions Overlay */}
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpen(pres.id)
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#e8ff57] hover:brightness-105 text-black text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg"
                        >
                          Open Deck
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onExport(pres)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold active:scale-95 border border-white/10"
                        >
                          Export
                        </button>
                      </div>

                      <div className="absolute bottom-2 right-2 text-[9px] font-bold text-neutral-300 bg-black/60 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md">
                        {pres.slides.length} Slides
                      </div>
                    </div>

                    {/* Info Footer */}
                    <div className="p-3.5 bg-[#121212] flex items-center justify-between border-t border-white/5">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white truncate" title={pres.title}>
                          {pres.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                          <span>{theme.name}</span>
                          <span>·</span>
                          <span>{date}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(pres.id)
                        }}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-white/5 active:scale-95 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                        title="Delete presentation"
                        aria-label={`Delete ${pres.title}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
