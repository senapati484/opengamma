import React from 'react'

interface LayoutContainerProps {
  /**
   * Left sidebar: Slide thumbnails, history, quick tools
   */
  sidebar: React.ReactNode
  /**
   * Center: Main slide preview canvas
   */
  canvas: React.ReactNode
  /**
   * Right panel: Theme, export, design systems (collapsible)
   */
  rightPanel?: React.ReactNode
  /**
   * Bottom: Prompt input (full width)
   */
  promptArea: React.ReactNode
  /**
   * Top: Titlebar + quick actions
   */
  titlebar: React.ReactNode
  /**
   * Show/hide right panel via toggle
   */
  isRightPanelOpen?: boolean
  onRightPanelToggle?: (open: boolean) => void
}

/**
 * Modern 3-Column Editor Layout
 * 
 * Structure:
 * ┌────────────────────────────────────────┐
 * │          TITLEBAR                      │
 * ├─────────┬──────────────────┬───────────┤
 * │         │                  │           │
 * │ SIDEBAR │  CANVAS (MAIN)   │ PANEL     │
 * │         │                  │           │
 * │ (240px) │   (flex-grow)    │  (280px)  │
 * │         │                  │           │
 * ├─────────┴──────────────────┴───────────┤
 * │     PROMPT INPUT (FULL WIDTH)          │
 * │           (120px height)                │
 * └────────────────────────────────────────┘
 */
export const LayoutContainer: React.FC<LayoutContainerProps> = ({
  sidebar,
  canvas,
  rightPanel,
  promptArea,
  titlebar,
  isRightPanelOpen = true,
  onRightPanelToggle
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800 font-sans antialiased">
      {/* Titlebar */}
      <div className="h-10 flex-none w-full border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        {titlebar}
      </div>

      {/* Main workspace: 3-column grid */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-60 flex-none border-r border-neutral-100 bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col">
          {sidebar}
        </aside>

        {/* CENTER CANVAS (MAIN CONTENT) */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
          {canvas}
        </main>

        {/* RIGHT PANEL (COLLAPSIBLE) */}
        {rightPanel && (
          <aside
            className={`flex-none border-l border-neutral-100 bg-white/50 backdrop-blur-sm overflow-hidden transition-all duration-300 ease-out flex flex-col ${
              isRightPanelOpen ? 'w-72' : 'w-0'
            }`}
          >
            {isRightPanelOpen && rightPanel}
          </aside>
        )}

        {/* Right panel toggle button (when collapsed) */}
        {rightPanel && !isRightPanelOpen && (
          <button
            onClick={() => onRightPanelToggle?.(true)}
            className="w-1 flex-none hover:w-2 bg-neutral-100 hover:bg-blue-300 transition-all duration-200 cursor-col-resize"
            title="Expand panel"
          />
        )}
      </div>

      {/* PROMPT AREA (FULL WIDTH BOTTOM) */}
      <div className="h-40 flex-none border-t border-neutral-100 bg-white/80 backdrop-blur-sm overflow-hidden flex flex-col">
        {promptArea}
      </div>
    </div>
  )
}

export default LayoutContainer
