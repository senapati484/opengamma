import React, { useState } from 'react'
import type { Presentation } from '../types'

export interface SidebarProps {
  /** Unsorted array of history presentations */
  presentations: Presentation[]
  /** ID of the active/selected presentation */
  activePresentationId: string | null
  /** Callback fired when a history item is selected */
  onSelect: (id: string) => void
  /** Callback fired when a history item is deleted */
  onDelete: (id: string) => void
  /** Callback fired when creating a new presentation draft */
  onNewPresentation: () => void
  /** Parent state visibility for settings panel */
  isSettingsOpen: boolean
  /** Parent state setter for settings panel visibility */
  setIsSettingsOpen: (open: boolean) => void
  /** Parent state visibility for keyboard shortcut help panel */
  isHelpOpen: boolean
  /** Parent state setter for keyboard shortcut help panel visibility */
  setIsHelpOpen: (open: boolean) => void
  /** Callback to go back to the dashboard */
  onGoToDashboard: () => void
}

/**
 * Utility to convert raw millisecond timestamps into readable relative strings.
 */
function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? 'yesterday' : `${days} days ago`
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }
  return 'just now'
}

/**
 * A sleek dual-column sidebar modeled after Gamma.app.
 * - Column 1 (60px): Utility and global icons (Home, Templates, Library, Settings, SW Avatar).
 * - Column 2 (220px): Folder navigator, Workspace settings, collapsable recent presentations.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  presentations,
  activePresentationId,
  onSelect,
  onDelete,
  onNewPresentation,
  setIsSettingsOpen,
  isHelpOpen: _,
  setIsHelpOpen,
  onGoToDashboard
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isRecentExpanded, setIsRecentExpanded] = useState(true)

  // Sort presentations by creation timestamp (descending)
  const sortedPresentations = [...presentations].sort((a, b) => b.createdAt - a.createdAt)

  // Truncate long slide titles safely
  const truncateTitle = (text: string): string => {
    const rawTitle = text || 'Untitled Deck'
    return rawTitle.length > 22 ? `${rawTitle.slice(0, 20)}...` : rawTitle
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (deleteConfirmId === id) {
      onDelete(id)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
    }
  }

  const handleMouseLeaveItem = () => {
    setDeleteConfirmId(null)
  }

  return (
    <div
      className={`relative flex h-full select-none transition-all duration-300 ease z-40 bg-[var(--og-bg)] border-r border-[var(--og-border)] ${
        isCollapsed ? 'w-[60px]' : 'w-[280px]'
      }`}
    >
      {/* ─── COLUMN 1: THIN ICON STRIP (60px) ─── */}
      <div className="w-[60px] h-full flex-none flex flex-col items-center justify-between py-4 border-r border-[var(--og-border)] bg-white drag-region">
        {/* Top: Logo & Main Navigation Icons */}
        <div className="flex flex-col items-center gap-5 w-full no-drag">
          {/* Logo Circle G */}
          <div
            onClick={onGoToDashboard}
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95 mb-2 mt-2"
            title="OpenGamma Home"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                fill="#0047ff"
              />
              <path
                d="M12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12H12V10H20C20.1 10.7 20.1 11.3 20.1 12C20.1 16.5 16.5 20.1 12 20.1C7.5 20.1 3.9 16.5 3.9 12C3.9 7.5 7.5 3.9 12 3.9C14.3 3.9 16.4 4.8 17.9 6.3L16.5 7.7C15.4 6.6 13.8 6 12 6Z"
                fill="white"
              />
            </svg>
          </div>

          {/* Navigation Links */}
          <button
            onClick={onGoToDashboard}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-[var(--og-accent)] hover:bg-neutral-50 transition-colors group cursor-pointer"
            title="Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5 tracking-tight">Home</span>
          </button>

          <button
            onClick={onNewPresentation}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-[var(--og-accent)] hover:bg-neutral-50 transition-colors group cursor-pointer"
            title="Create Template"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5 tracking-tight font-sans">Templates</span>
          </button>

          <button
            onClick={onGoToDashboard}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-[var(--og-accent)] hover:bg-neutral-50 transition-colors group cursor-pointer"
            title="Library"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H20" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5 tracking-tight">Library</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-[var(--og-accent)] hover:bg-neutral-50 transition-colors group cursor-pointer"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5 tracking-tight font-sans">Settings</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-[var(--og-accent)] hover:bg-neutral-50 transition-colors group cursor-pointer"
            title="Shortcuts Help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5 tracking-tight font-sans">Shortcuts</span>
          </button>
        </div>

        {/* Bottom: User Avatar */}
        <div className="w-full flex justify-center mb-1 no-drag">
          <div
            onClick={onGoToDashboard}
            className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer border border-emerald-600"
            title="Sayan Senapati's Workspace"
          >
            SW
          </div>
        </div>
      </div>

      {/* ─── COLUMN 2: SECONDARY DETAIL COLUMN (220px) ─── */}
      <div
        className={`h-full flex-col bg-[var(--og-surface)] select-none transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'w-0' : 'w-[220px]'
        } flex`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute left-[266px] top-6 z-50 flex items-center justify-center w-7 h-7 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 shadow-md cursor-pointer transition-transform duration-200 active:scale-90"
          title="Collapse Sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Header: Workspace Selector */}
        <div className="flex flex-col p-4 pb-3 border-b border-[var(--og-border)] drag-region">
          <div className="flex items-center justify-between no-drag bg-white/40 hover:bg-white/80 border border-neutral-200/50 hover:border-neutral-200 p-2 rounded-xl transition-all cursor-pointer">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-neutral-800 leading-tight">Sayan's Workspace</span>
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5 bg-neutral-200/40 text-neutral-500 px-1 rounded w-fit">Free</span>
            </div>
            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Secondary lists */}
        <div className="flex-grow overflow-y-auto px-3.5 py-4 flex flex-col gap-5 theme-scroll-container">
          {/* Main Links */}
          <div className="flex flex-col gap-1">
            <button
              onClick={onGoToDashboard}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                activePresentationId === null
                  ? 'bg-white border-neutral-200/80 text-[var(--og-accent)] shadow-sm'
                  : 'bg-transparent border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-white/40'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Gammas</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 hover:bg-white/40 border border-transparent transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search <kbd className="text-[10px] bg-neutral-200/60 px-1 rounded ml-auto text-neutral-500 border border-neutral-300/40">⌘K</kbd></span>
            </button>

            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 hover:bg-white/40 border border-transparent transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Shared with you</span>
            </button>

            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 hover:bg-white/40 border border-transparent transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Sites</span>
            </button>

            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 hover:bg-white/40 border border-transparent transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>API Generated</span>
            </button>
          </div>

          {/* FOLDERS block */}
          <div className="flex flex-col gap-1 bg-white/40 border border-neutral-200/60 rounded-xl p-3.5 text-xs text-neutral-600">
            <span className="font-bold text-[9px] text-neutral-400 uppercase tracking-widest mb-1.5">Folders</span>
            <p className="leading-relaxed text-[11px] text-neutral-500 font-medium">
              Organize your gammas by topic and share them with your team.
            </p>
            <span
              onClick={onGoToDashboard}
              className="text-[#0047ff] hover:underline font-bold mt-2.5 inline-block cursor-pointer text-[11px] w-fit"
            >
              Create or join a folder
            </span>
          </div>

          {/* Collapsible Recent presentations section */}
          <div className="flex flex-col gap-1">
            <div
              onClick={() => setIsRecentExpanded(!isRecentExpanded)}
              className="flex items-center justify-between px-1.5 py-1 text-[9px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 select-none"
            >
              <span>Recent Decks</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isRecentExpanded ? '' : '-rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {isRecentExpanded && (
              <div className="flex flex-col gap-1 mt-1 pl-1">
                {sortedPresentations.map((p) => {
                  const isActive = activePresentationId === p.id
                  const isConfirmingDelete = deleteConfirmId === p.id

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelect(p.id)}
                      onMouseLeave={handleMouseLeaveItem}
                      className={`group relative flex flex-col gap-1 p-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                        isActive
                          ? 'bg-white border-neutral-200/80 text-[var(--og-accent)] shadow-sm'
                          : 'bg-transparent border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-white/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-semibold text-[11px] leading-tight text-neutral-700 truncate max-w-[140px]">
                          {truncateTitle(p.title)}
                        </h4>

                        {/* Inline Delete trigger */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity z-10 flex-none ml-1">
                          {isConfirmingDelete ? (
                            <button
                              onClick={(e) => handleDeleteClick(e, p.id)}
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm animate-pulse"
                            >
                              Sure?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick(e, p.id)}
                              className="p-0.5 rounded text-neutral-400 hover:text-red-500 hover:bg-neutral-100 transition-colors"
                              title="Delete Presentation"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Deck Info Row */}
                      <div className="flex items-center gap-1.5 text-[8.5px] text-neutral-400 font-medium">
                        <span className="bg-neutral-200/50 border border-neutral-300/20 px-1 py-0.2 rounded text-neutral-500 select-none">
                          {p.slides.length} slides
                        </span>
                        <span>•</span>
                        <span>{getRelativeTime(p.createdAt)}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Empty history indicator */}
                {presentations.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center mt-3 py-3 select-none border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">No Decks</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info - Trash */}
        <div className="border-t border-[var(--og-border)] p-4 flex items-center justify-between text-neutral-500 font-medium">
          <button
            onClick={onGoToDashboard}
            className="flex items-center gap-1.5 hover:text-neutral-700 text-xs cursor-pointer"
          >
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Trash</span>
          </button>
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">OpenGamma</span>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
