import { useEffect, useRef } from 'react'

// ─── Shortcut Handler Catalogue ────────────────────────────────────────────────

export interface ShortcutHandlers {
  /** ⌘/Ctrl + Enter  — submit the prompt and start generation */
  onGenerate?: () => void
  /** ⌘/Ctrl + E      — export the active presentation as PPTX */
  onExport?: () => void
  /** ⌘/Ctrl + S      — manually save the active presentation */
  onSave?: () => void
  /** ⌘/Ctrl + N      — discard draft and start a new blank presentation */
  onNew?: () => void
  /** ⌘/Ctrl + ,      — open the application Settings panel */
  onOpenSettings?: () => void
  /** Escape           — cancel generation when running, or close the topmost modal */
  onEscape?: () => void
  /** ← Arrow         — navigate to the previous slide (suppressed inside form controls) */
  onPrevSlide?: () => void
  /** → Arrow         — navigate to the next slide (suppressed inside form controls) */
  onNextSlide?: () => void
  /** ⌘/Ctrl + Z      — undo the most recent slide edit (suppressed inside form controls) */
  onUndo?: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Registers a single global `keydown` listener on `window` that dispatches to
 * the provided handler callbacks.
 *
 * Handlers are stored in a stable `ref` so the effect only mounts/unmounts once
 * (no stale-closure re-registration on every render cycle).
 *
 * Arrow key navigation is deliberately suppressed while the cursor is inside an
 * `<input>`, `<textarea>`, or `<select>` element to avoid conflicting with
 * normal text-editing workflows.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  // Always keep the ref current so the single listener reads the latest
  // callbacks without needing to be torn down and re-registered.
  const ref = useRef<ShortcutHandlers>(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? ''
      const inFormControl = tag === 'input' || tag === 'textarea' || tag === 'select'

      // ── Modifier-key combos ─────────────────────────────────────────────────
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'enter':
            // Allow even from inside a textarea — PromptInput stops propagation
            // after handling it locally, so this only fires when focus is elsewhere.
            e.preventDefault()
            ref.current.onGenerate?.()
            return

          case 'e':
            e.preventDefault()
            ref.current.onExport?.()
            return

          case 's':
            e.preventDefault()
            ref.current.onSave?.()
            return

          case 'n':
            e.preventDefault()
            ref.current.onNew?.()
            return

          case ',':
            e.preventDefault()
            ref.current.onOpenSettings?.()
            return

          case 'z':
            // Only intercept undo when not editing text so the browser's native
            // undo behaviour in form controls is preserved.
            if (!inFormControl) {
              e.preventDefault()
              ref.current.onUndo?.()
            }
            return
        }
      }

      // ── Unmodified shortcuts ────────────────────────────────────────────────

      if (e.key === 'Escape') {
        ref.current.onEscape?.()
        return
      }

      // Arrow slide navigation — suppressed inside form controls.
      if (!inFormControl && !isMod) {
        if (e.key === 'ArrowLeft') {
          ref.current.onPrevSlide?.()
          return
        }
        if (e.key === 'ArrowRight') {
          ref.current.onNextSlide?.()
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // ← empty deps intentional: handlers are read from the ref
}
