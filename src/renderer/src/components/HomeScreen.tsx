import React, { useState } from 'react'
import type { Presentation } from '../types'
import { themes } from '../lib/themes'

interface HomeScreenProps {
  presentations: Presentation[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onExport: (pres: Presentation) => void
  onNew: () => void
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  presentations,
  onOpen,
  onDelete,
  onExport,
  onNew
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent')

  const filtered = activeTab === 'recent' 
    ? presentations.slice(0, 6) 
    : presentations

  return (
    <div className="flex-1 h-full bg-[#0d0d0d] flex flex-col overflow-hidden">
      
      {/* Tab Row */}
      <div className="flex items-center px-8 border-b border-white/5 h-[52px]">
        <button 
          onClick={() => setActiveTab('recent')}
          className={`px-4 h-full text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'recent' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Recent
          {activeTab === 'recent' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8ff57]" />}
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 h-full text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'all' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Your Presentations
          {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8ff57]" />}
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {presentations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-3xl">
              🗂️
            </div>
            <div>
              <div className="text-lg font-bold text-white">No presentations yet</div>
              <p className="text-sm text-neutral-500 max-w-[280px] mx-auto mt-1">
                Start by describing your vision in the left panel and let OpenGamma build it.
              </p>
            </div>
            <button 
              onClick={onNew}
              className="text-xs font-bold text-[#e8ff57] hover:underline uppercase tracking-widest"
            >
              Generate your first one →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {filtered.map(pres => {
              const theme = themes.find(t => t.id === pres.theme) || themes[0]
              const date = new Date(pres.createdAt).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric' 
              })

              return (
                <div 
                  key={pres.id}
                  onClick={() => onOpen(pres.id)}
                  className="group relative flex flex-col bg-[#141414] border border-white/5 rounded-2xl overflow-hidden hover:border-[#e8ff57]/20 transition-all cursor-pointer shadow-lg hover:shadow-[#e8ff57]/5"
                >
                  {/* Thumbnail Preview */}
                  <div 
                    className="aspect-video w-full flex items-center justify-center p-6 relative overflow-hidden"
                    style={{ background: theme.colors.bg }}
                  >
                    <div className="text-center space-y-2 pointer-events-none">
                      <div className="text-[10px] font-black uppercase tracking-tighter" style={{ color: theme.colors.primary }}>{pres.title}</div>
                      <div className="flex flex-col gap-1 items-center opacity-40">
                         <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: theme.colors.text }} />
                         <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: theme.colors.text }} />
                      </div>
                    </div>

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); onOpen(pres.id); }}
                        className="p-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl"
                       >
                         Open
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); onExport(pres); }}
                        className="p-2.5 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 active:scale-95"
                       >
                         Export
                       </button>
                    </div>

                    <div className="absolute bottom-2 right-3 text-[9px] font-bold text-neutral-500 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-md border border-white/5 backdrop-blur-md">
                      {pres.slides.length} Slides
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{pres.title}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{theme.name} · {date}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(pres.id); }}
                      className="p-2 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  )
}
