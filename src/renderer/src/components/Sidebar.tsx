import React, { useState } from 'react'
import type { Presentation, AppSettings } from '../types'
import { useElectron } from '../lib/useElectron'
import { themes } from '../lib/themes'

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
 * A collapsible sidebar displaying historical presentations and application utilities.
 * Implements local confirm-to-delete flows to protect data, computes relative dates,
 * and launches a sleek Settings overlay leveraging direct `electronAPI` load/save.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  presentations,
  activePresentationId,
  onSelect,
  onDelete,
  onNewPresentation
}) => {
  const electronAPI = useElectron()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Settings Panel Overlay States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  // Sort presentations by creation timestamp (descending)
  const sortedPresentations = [...presentations].sort((a, b) => b.createdAt - a.createdAt)

  // Truncate long slide titles safely
  const truncateTitle = (text: string): string => {
    const rawTitle = text || 'Untitled Deck'
    return rawTitle.length > 28 ? `${rawTitle.slice(0, 25)}...` : rawTitle
  }

  // Load configuration from local electron-store when Settings are opened
  const handleOpenSettings = async () => {
    setIsSettingsOpen(true)
    try {
      const loadedSettings = await electronAPI.getSettings()
      setSettings(loadedSettings)
    } catch (err) {
      console.error('[Sidebar] Failed to load app settings:', err)
    }
  }

  // Save updated config using Electron IPC handlers
  const handleSaveSettings = async () => {
    if (!settings) return
    try {
      await electronAPI.saveSettings(settings)
      setIsSettingsOpen(false)
    } catch (err) {
      console.error('[Sidebar] Failed to save app settings:', err)
    }
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
      className={`relative flex flex-col h-full bg-[#0d0d0d] border-r border-white/[0.07] select-none transition-all duration-200 ease z-40 ${
        isCollapsed ? 'w-16' : 'w-[240px]'
      }`}
    >
      {/* Collapse boundary toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-[52px] z-50 flex items-center justify-center w-7 h-7 rounded-full border border-neutral-800 bg-neutral-900 hover:bg-neutral-855 text-neutral-400 hover:text-neutral-200 shadow-md cursor-pointer transition-transform duration-200 active:scale-90 no-drag"
        style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Top Header / App Branding */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-4 pb-6 pt-12 border-b border-white/[0.04] select-none drag-region">
          <span
            className="text-lg font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent cursor-pointer no-drag"
            onClick={onNewPresentation}
            title="Create New Slide Deck"
          >
            Ω
          </span>
          <button
            onClick={onNewPresentation}
            className="w-10 h-10 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-850 flex items-center justify-center text-neutral-200 transition-colors shadow-lg active:scale-95 no-drag"
            title="New Presentation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-col p-4.5 pb-4 pt-12 border-b border-white/[0.04] select-none drag-region">
          <div className="flex items-center justify-between">
            <span
              onClick={onNewPresentation}
              className="text-base font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all no-drag"
            >
              OpenGamma
            </span>
            <button
              onClick={onNewPresentation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-850 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-all shadow-md active:scale-95 no-drag"
            >
              <svg
                className="w-3.5 h-3.5 text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Presentation History List */}
      <div className="flex-grow overflow-y-auto px-3.5 py-4 flex flex-col gap-2.5 theme-scroll-container">
        {sortedPresentations.map((p) => {
          const isActive = activePresentationId === p.id
          const isConfirmingDelete = deleteConfirmId === p.id

          if (isCollapsed) {
            return (
              <div
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 border ${
                  isActive
                    ? 'bg-white/[0.06] border-white/10 text-violet-400 shadow-md'
                    : 'bg-transparent border-transparent hover:border-white/5 hover:bg-white/[0.02] text-neutral-500 hover:text-neutral-300'
                }`}
                title={`${p.title || 'Untitled Deck'} (${p.slides.length} slides)`}
              >
                <span>{p.slides.length}</span>
              </div>
            )
          }

          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              onMouseLeave={handleMouseLeaveItem}
              className={`group relative flex flex-col gap-1 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                isActive
                  ? 'bg-white/[0.06] border-white/10 text-neutral-100 shadow-lg'
                  : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <h4 className="font-semibold text-[11px] leading-snug text-neutral-200 break-all select-none">
                  {truncateTitle(p.title)}
                </h4>

                {/* Inline Delete trigger */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {isConfirmingDelete ? (
                    <button
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      className="px-2 py-0.5 rounded text-[9px] font-bold text-white bg-red-650 hover:bg-red-500 shadow-md animate-pulse no-drag"
                    >
                      Sure?
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      className="p-1 rounded text-neutral-500 hover:text-red-500 hover:bg-white/[0.06] transition-colors no-drag"
                      title="Delete Presentation"
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                  )}
                </div>
              </div>

              {/* Deck Info Row */}
              <div className="flex items-center gap-2.5 text-[9px] text-neutral-500 mt-1 font-medium select-none">
                <span className="bg-black/40 border border-white/[0.04] px-1.5 py-0.5 rounded text-neutral-400 select-none">
                  {p.slides.length} slides
                </span>
                <span>•</span>
                <span>{getRelativeTime(p.createdAt)}</span>
              </div>
            </div>
          )
        })}

        {/* Empty history indicator */}
        {presentations.length === 0 && !isCollapsed && (
          <div className="flex flex-col items-center justify-center text-center mt-8 px-2 select-none">
            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
              No History
            </span>
            <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">
              Your generated presentations will show up here.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible/Expanded Footer Utility */}
      <div className="border-t border-white/[0.04] p-3.5 flex items-center justify-center">
        {isCollapsed ? (
          <button
            onClick={handleOpenSettings}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04] transition-colors cursor-pointer active:scale-95 no-drag"
            title="Application Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleOpenSettings}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-colors active:scale-[0.98] no-drag"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Settings</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-bold">Preferences</span>
          </button>
        )}
      </div>

      {/* Embedded application configuration modal (SettingsPanel) */}
      {isSettingsOpen && settings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-5.5 shadow-2xl flex flex-col gap-4.5">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-extrabold text-neutral-100 uppercase tracking-wider">
                Application Settings
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-lg hover:bg-neutral-900 transition-colors active:scale-90"
              >
                <svg
                  className="w-4.5 h-4.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* API Key settings input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  Anthropic Claude API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={settings.claudeApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, claudeApiKey: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-800"
                />
              </div>

              {/* Default Theme settings selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  Default Theme
                </label>
                <select
                  value={settings.defaultTheme || 'startup-gradient'}
                  onChange={(e) => setSettings({ ...settings, defaultTheme: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 transition-colors cursor-pointer"
                >
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Numeric default slide input settings */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  Default Slide Count (4-20)
                </label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={settings.defaultSlideCount || 8}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultSlideCount: Math.max(
                        4,
                        Math.min(20, parseInt(e.target.value, 10) || 8)
                      )
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 transition-colors text-center"
                />
              </div>

              {/* Default narrative settings dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  Default Narrative Profile
                </label>
                <select
                  value={settings.defaultNarrative || 'explainer'}
                  onChange={(e) => setSettings({ ...settings, defaultNarrative: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 transition-colors cursor-pointer"
                >
                  <option value="explainer">Explainer</option>
                  <option value="pitch">VC Pitch Deck</option>
                  <option value="report">Report</option>
                  <option value="academic">Academic Paper</option>
                </select>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-all select-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-lg hover:shadow-violet-600/20 active:scale-95 transition-all select-none"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
