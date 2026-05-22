import React, { useEffect, useState } from 'react'
import { useElectron } from '../lib/useElectron'

export const UpdateBanner: React.FC = () => {
  const electron = useElectron()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Register the update-ready listener
    const unsubscribe = electron.onUpdateReady(() => {
      console.log('[UpdateBanner] Update ready event received from main process!')
      setIsVisible(true)
    })

    return () => {
      unsubscribe()
    }
  }, [electron])

  if (!isVisible) {
    return null
  }

  const handleRestart = () => {
    electron.restartAndInstall()
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  return (
    <div className="w-full bg-gradient-to-r from-violet-600/95 to-fuchsia-600/95 backdrop-blur-md text-white border-b border-violet-500/20 py-2.5 px-4 flex items-center justify-between shadow-lg relative z-50 select-none animate-fade-in flex-none">
      <div className="flex items-center gap-3 mx-auto">
        {/* Animated download/update SVG icon */}
        <div className="bg-white/10 p-1.5 rounded-lg flex-shrink-0 animate-pulse">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </div>
        <p className="text-xs font-semibold tracking-wide text-neutral-100">
          Open Gamma update ready — restart to apply the latest enhancements.
        </p>
        <button
          onClick={handleRestart}
          className="ml-4 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-violet-950 bg-white hover:bg-violet-50 active:scale-95 transition-all shadow-md shadow-black/10 cursor-pointer"
        >
          Restart
        </button>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="text-violet-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-90 cursor-pointer shrink-0 absolute right-4"
        aria-label="Dismiss update banner"
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
  )
}
