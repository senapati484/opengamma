import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Theme, Presentation, AppSettings } from '../types'
import type { DesignSystemMetadata } from '../types/designSystem'
import { useElectron } from '../lib/useElectron'
import { themes } from '../lib/themes'

interface AppContextType {
  activeTheme: Theme | null
  setActiveTheme: React.Dispatch<React.SetStateAction<Theme | null>>
  presentations: Presentation[]
  setPresentations: React.Dispatch<React.SetStateAction<Presentation[]>>
  activePresentation: Presentation | null
  setActivePresentation: React.Dispatch<React.SetStateAction<Presentation | null>>
  settings: AppSettings | null
  setSettings: React.Dispatch<React.SetStateAction<AppSettings | null>>
  // New: Design System Support (Phase 2)
  selectedDesignSystem: DesignSystemMetadata | null
  setSelectedDesignSystem: React.Dispatch<React.SetStateAction<DesignSystemMetadata | null>>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const electronAPI = useElectron()
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [activePresentation, setActivePresentation] = useState<Presentation | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selectedDesignSystem, setSelectedDesignSystem] = useState<DesignSystemMetadata | null>(null)

  useEffect(() => {
    const initData = async () => {
      try {
        const history = await electronAPI.getHistory()
        setPresentations(history)
      } catch (err) {
        console.error('[AppContext] Failed to load history:', err)
      }

      try {
        const loadedSettings = await electronAPI.getSettings()
        setSettings(loadedSettings)
        const defaultThemeId = loadedSettings.defaultTheme || 'startup-gradient'
        const themeObj = themes.find((t) => t.id === defaultThemeId) || themes[0]
        setActiveTheme(themeObj)
      } catch (err) {
        console.error('[AppContext] Failed to load settings:', err)
      }
    }
    initData()
  }, [])

  return (
    <AppContext.Provider
      value={{
        activeTheme,
        setActiveTheme,
        presentations,
        setPresentations,
        activePresentation,
        setActivePresentation,
        settings,
        setSettings,
        selectedDesignSystem,
        setSelectedDesignSystem
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
