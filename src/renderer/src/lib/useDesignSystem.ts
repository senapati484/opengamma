import { useState, useCallback } from 'react'
import type { DesignSystemMetadata } from '../types/designSystem'

/**
 * useDesignSystem Hook
 * Manages selected design system and provides utility functions
 * to apply design tokens to presentations
 */
export function useDesignSystem(): {
  selectedSystem: DesignSystemMetadata | null
  isLoadingSystem: boolean
  selectSystem: (system: DesignSystemMetadata) => Promise<void>
  clearSystem: () => void
  generateCssVariables: () => string
  generatePromptHint: () => string
} {
  const [selectedSystem, setSelectedSystem] = useState<DesignSystemMetadata | null>(null)
  const [isLoadingSystem, setIsLoadingSystem] = useState(false)

  const selectSystem = useCallback(async (system: DesignSystemMetadata) => {
    setIsLoadingSystem(true)
    try {
      setSelectedSystem(system)
      // TODO: In Phase 2.2, fetch the full DESIGN.md here
      // const fullSystem = await fetchDesignSystemFromGitHub(system.slug)
      // setSelectedSystem(fullSystem)
    } finally {
      setIsLoadingSystem(false)
    }
  }, [])

  const clearSystem = useCallback(() => {
    setSelectedSystem(null)
  }, [])

  /**
   * Generate CSS variables for the selected design system
   * This can be injected into presentation slides
   */
  const generateCssVariables = useCallback((): string => {
    if (!selectedSystem) return ''

    const cssVars = `
      :root {
        --ds-brand-color: ${selectedSystem.brandColor};
        --ds-text-color: ${selectedSystem.textColor};
        --ds-background-color: ${selectedSystem.backgroundColor};
        --ds-system-name: "${selectedSystem.name}";
        --ds-system-category: "${selectedSystem.category}";
      }
    `.trim()

    return cssVars
  }, [selectedSystem])

  /**
   * Generate a system prompt snippet for Claude
   * to follow the design system while generating slides
   */
  const generatePromptHint = useCallback((): string => {
    if (!selectedSystem) return ''

    return `
## Design System: ${selectedSystem.name}

Use the ${selectedSystem.name} design system for styling:
- Brand Color: ${selectedSystem.brandColor}
- Text Color: ${selectedSystem.textColor}
- Background: ${selectedSystem.backgroundColor}
- Category: ${selectedSystem.category}
- Description: ${selectedSystem.description}

Ensure all slide styling follows this design system's color palette and typography rules.
    `.trim()
  }, [selectedSystem])

  return {
    selectedSystem,
    isLoadingSystem,
    selectSystem,
    clearSystem,
    generateCssVariables,
    generatePromptHint
  }
}
