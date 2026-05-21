import { useState, useEffect, useRef, useCallback } from 'react'
import type { Slide, StreamStatus, GenerationConfig } from '../types'
import { useElectron } from './useElectron'

/**
 * A custom React hook that manages the entire presentation generation lifecycle
 * inside the Electron renderer. It handles:
 * - Incrementally appending generated slides to the local immutable state.
 * - Tracking generation and stream statuses (idle, generating, done, error).
 * - Automatic cleanup of IPC event listeners on completion, error, or unmount.
 * - Safely cancelling any active generation before triggering a new run.
 */
export function useStream() {
  const electronAPI = useElectron()
  const [slides, setSlides] = useState<Slide[]>([])
  const [status, setStatus] = useState<StreamStatus>({
    state: 'idle',
    slidesGenerated: 0,
    totalSlides: 0
  })

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

      // 3. Register electronAPI.onSlideGenerated listener -> append new slide
      const unsubscribeSlide = electronAPI.onSlideGenerated((newSlide: Slide) => {
        // Slides array must be immutable - always spread [...prev, newSlide]
        setSlides((prev) => [...prev, newSlide])
      })

      // 4. Register electronAPI.onStreamStatus listener -> update status state
      const unsubscribeStatus = electronAPI.onStreamStatus((streamStatus: StreamStatus) => {
        setStatus(streamStatus)

        // Automatically clean up IPC listeners once the stream is finished or errored
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

  // Clean up all active listeners on component unmount
  useEffect(() => {
    return () => {
      if (cleanupsRef.current.length > 0) {
        electronAPI.cancelGeneration()
      }
      cleanupListeners()
    }
  }, [electronAPI, cleanupListeners])

  return { slides, status, generate, cancel, reset }
}
