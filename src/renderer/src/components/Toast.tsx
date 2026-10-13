import React, { useEffect } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  action?: ToastAction
  onClose: () => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  action,
  onClose,
  duration = 6000
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [onClose, duration])

  // Icon mapping
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg
            className="w-5 h-5 text-emerald-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'error':
        return (
          <svg
            className="w-5 h-5 text-rose-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'warning':
        return (
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg
            className="w-5 h-5 text-sky-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  // Border and shadow styling classes
  const getStyleClasses = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 shadow-emerald-500/5'
      case 'error':
        return 'border-rose-500/30 shadow-rose-500/5'
      case 'warning':
        return 'border-amber-500/30 shadow-amber-500/5'
      case 'info':
      default:
        return 'border-white/10 shadow-white/5'
    }
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3.5 px-4 py-3.5 rounded-2xl border bg-[#161616]/95 backdrop-blur-md shadow-2xl animate-fade-in select-none max-w-sm transition-all duration-300 ${getStyleClasses()}`}
    >
      {renderIcon()}

      <div className="flex-grow flex flex-col gap-1 min-w-[200px]">
        <span className="text-xs font-medium leading-relaxed text-neutral-100">{message}</span>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              action.onClick()
            }}
            className="text-[10px] font-bold text-[#e8ff57] hover:text-[#d4eb48] transition-colors uppercase tracking-wider text-left mt-1 active:scale-95 duration-100 cursor-pointer"
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
        title="Dismiss notification"
        aria-label="Dismiss notification"
      >
        <svg
          className="w-4 h-4"
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
