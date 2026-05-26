import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Slide, StreamStatus, GenerationConfig, Presentation } from '../types'
import { useElectron } from './useElectron'
import { useAppContext } from '../context/AppContext'

/**
 * A custom React hook that manages the entire presentation generation lifecycle
 * inside the Electron renderer. It handles:
 * - Incrementally appending generated slides to the local immutable state.
 * - Tracking generation and stream statuses (idle, generating, done, error).
 * - Automatic cleanup of IPC event listeners on completion, error, or unmount.
 * - Safely cancelling any active generation before triggering a new run.
 */
export function useStream(): {
  slides: Slide[]
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>
  status: StreamStatus
  generate: (config: GenerationConfig) => void
  cancel: () => void
  reset: () => void
  regeneratingIndex: number | undefined
  regenerateSingleSlide: (
    slideIndex: number,
    currentPresentation: Presentation
  ) => Promise<Slide | null>
  regenerateSlide: (slideIndex: number) => Promise<void>
} {
  const electronAPI = useElectron()
  const { activePresentation } = useAppContext()
  const [slides, setSlides] = useState<Slide[]>([])
  const [status, setStatus] = useState<StreamStatus>({
    state: 'idle',
    slidesGenerated: 0,
    totalSlides: 0
  })
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | undefined>(undefined)

  // Store active IPC unsubscribe/cleanup callbacks across renders
  const cleanupsRef = useRef<(() => void)[]>([])

  /**
   * Helper function to execute all currently registered listener cleanup functions
   * and reset the local cleanup array.
   */
  const cleanupListeners = useCallback(() => {
    cleanupsRef.current.forEach((cleanup) => {
      try {
        cleanup()
      } catch (err) {
        console.error('[useStream] Error executing listener cleanup:', err)
      }
    })
    cleanupsRef.current = []
  }, [])

  /**
   * Cancels the active slide generation, cleans up listeners, and resets status.
   */
  const cancel = useCallback(() => {
    electronAPI.cancelGeneration()
    cleanupListeners()
    setStatus((prev) => ({
      ...prev,
      state: 'idle'
    }))
  }, [electronAPI, cleanupListeners])

  /**
   * Resets all internal hook states back to their pristine initial values,
   * also cancelling any active generation run.
   */
  const reset = useCallback(() => {
    if (cleanupsRef.current.length > 0) {
      electronAPI.cancelGeneration()
      cleanupListeners()
    }
    setSlides([])
    setStatus({
      state: 'idle',
      slidesGenerated: 0,
      totalSlides: 0
    })
  }, [electronAPI, cleanupListeners])

  /**
   * Initiates the slide generation workflow using the provided config.
   * Ensures that any running generation is cancelled first before setting up new listeners.
   */
  const generate = useCallback(
    (config: GenerationConfig) => {
      // If generate is called while already generating, cancel first
      if (cleanupsRef.current.length > 0) {
        electronAPI.cancelGeneration()
        cleanupListeners()
      }

      // 1. Reset slides to []
      setSlides([])

      // 2. Set status to indicate we are generating
      setStatus({
        state: 'generating',
        slidesGenerated: 0,
        totalSlides: config.slideCount
      })

      // 3. Register electronAPI.onSlideGenerated listener -> append or replace slide
      const unsubscribeSlide = electronAPI.onSlideGenerated((newSlide: Slide) => {
        setSlides((prev) => {
          const index = prev.findIndex((s) => s.id === newSlide.id || s.index === newSlide.index)
          if (index !== -1) {
            const copy = [...prev]
            copy[index] = newSlide
            return copy
          }
          return [...prev, newSlide]
        })
      })

      // 4. Register electronAPI.onStreamStatus listener -> update status state
      const unsubscribeStatus = electronAPI.onStreamStatus((streamStatus: StreamStatus) => {
        setStatus(streamStatus)

        // Automatically clean up IPC listeners once the stream is finished or errored
        // NOTE: 'imaging' is an intermediate state - keep listeners active until truly done
        if (streamStatus.state === 'done' || streamStatus.state === 'error') {
          cleanupListeners()
        }
      })

      // 6. Store cleanup functions from the listener registrations
      cleanupsRef.current = [unsubscribeSlide, unsubscribeStatus]

      // 5. Call electronAPI.generateSlides(config) to start the IPC process
      electronAPI.generateSlides(config).catch((err) => {
        console.error('[useStream] Failed to initiate slide generation:', err)
        setStatus((prev) => ({
          ...prev,
          state: 'error',
          errorMessage: err instanceof Error ? err.message : String(err)
        }))
        cleanupListeners()
      })
    },
    [electronAPI, cleanupListeners]
  )

  // Synchronize local slides with active presentation when not generating
  useEffect(() => {
    const isActive = status.state === 'generating' || status.state === 'researching' || status.state === 'imaging'
    if (!isActive && activePresentation) {
      setSlides(activePresentation.slides)
    }
  }, [activePresentation, status.state])

  /**
   * Regenerates a single slide in isolation using the main process AI pipeline.
   * Updates only the slide at the target index when the response is completed.
   */
  const regenerateSingleSlide = useCallback(
    async (slideIndex: number, currentPresentation: Presentation) => {
      if (regeneratingIndex !== null) return null

      try {
        setRegeneratingIndex(slideIndex)

        // Trigger IPC call to the main process
        const updatedSlide = await electronAPI.regenerateSlide(slideIndex, currentPresentation)

        // Update the slides array immutably
        setSlides((prev) => {
          if (prev.length === 0) return prev
          return prev.map((s, idx) => (idx === slideIndex ? updatedSlide : s))
        })

        // Updates the Reveal.js iframe: replaces the slide at that index instead of appending
        const revealIframe = (document.getElementById('reveal-host-iframe') ||
          document.querySelector('iframe[title="Live Slide Preview"]')) as HTMLIFrameElement | null
        if (revealIframe && revealIframe.contentDocument) {
          const doc = revealIframe.contentDocument
          const slidesContainer = doc.querySelector('.reveal .slides')
          if (slidesContainer) {
            const sections = slidesContainer.querySelectorAll('section')
            const targetSection = sections[slideIndex]
            if (targetSection) {
              const tempDiv = doc.createElement('div')
              const trimmedHtml = updatedSlide.html.trim()
              let newSection: Element | null = null
              if (trimmedHtml.startsWith('<section')) {
                tempDiv.innerHTML = trimmedHtml
                newSection = tempDiv.firstElementChild
              }
              if (!newSection) {
                newSection = doc.createElement('section')
                newSection.innerHTML = updatedSlide.html
              }
              slidesContainer.replaceChild(newSection, targetSection)

              const win = revealIframe.contentWindow as any
              if (win && win.Reveal) {
                win.Reveal.sync()
                win.Reveal.slide(slideIndex)
              }
            }
          }
        }

        // Also post message for backward compatibility / other potential listeners
        if (revealIframe && revealIframe.contentWindow) {
          revealIframe.contentWindow.postMessage(
            {
              type: 'REPLACE_SLIDE',
              index: slideIndex,
              html: updatedSlide.html
            },
            '*'
          )
        }

        return updatedSlide
      } catch (err: unknown) {
        console.error('[useStream] Single-slide regeneration failed:', err)
        throw err
      } finally {
        setRegeneratingIndex(undefined)
      }
    },
    [electronAPI, regeneratingIndex]
  )

  /**
   * Regenerates a single slide without re-generating the whole presentation.
   * Updates slides[slideIndex] with the new slide when it arrives.
   */
  const regenerateSlide = useCallback(
    async (slideIndex: number): Promise<void> => {
      if (!activePresentation) {
        throw new Error('No active presentation to regenerate slide for.')
      }
      await regenerateSingleSlide(slideIndex, activePresentation)
    },
    [regenerateSingleSlide, activePresentation]
  )

  // Clean up all active listeners on component unmount
  useEffect(() => {
    return () => {
      if (cleanupsRef.current.length > 0) {
        electronAPI.cancelGeneration()
      }
      cleanupListeners()
    }
  }, [electronAPI, cleanupListeners])

  return {
    slides,
    setSlides,
    status,
    generate,
    cancel,
    reset,
    regeneratingIndex,
    regenerateSingleSlide,
    regenerateSlide
  }
}
