import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { GenerationConfig } from '../renderer/src/types'
import { themes } from '../renderer/src/lib/themes'

/**
 * Builds the comprehensive system prompt to be sent to Anthropic's Claude API.
 * It reads the main context template (GAMMA_CONTEXT.md) and customises it by
 * injecting runtime configuration values, theme CSS tokens, narrative style,
 * and font imports.
 *
 * @param config The generation configuration containing prompt, theme, slideCount, and narrative.
 * @returns The fully constructed and populated system prompt.
 * @throws An error if GAMMA_CONTEXT.md is missing.
 */
export async function buildSystemPrompt(config: GenerationConfig): Promise<string> {
  const appPath = app.getAppPath()

  // 1. Read GAMMA_CONTEXT.md from disk (throws descriptive error if not found)
  const contextPath = join(appPath, 'resources/context/GAMMA_CONTEXT.md')
  let template: string
  try {
    template = await fs.readFile(contextPath, 'utf8')
  } catch (error: any) {
    throw new Error(
      `Critical context file missing: GAMMA_CONTEXT.md could not be read at "${contextPath}". ` +
        `Ensure the context directory and GAMMA_CONTEXT.md are properly packaged. (Internal error: ${error.message})`
    )
  }

  // 2. Load the theme token file from resources/context/themes/{config.theme.id}.css
  //    Fallback to startup-gradient theme if not found.
  let themeTokens = ''
  const themeId = config.theme?.id || 'startup-gradient'
  const themePath = join(appPath, 'resources/context/themes', `${themeId}.css`)

  try {
    themeTokens = await fs.readFile(themePath, 'utf8')
  } catch (error: any) {
    if (error.code === 'ENOENT' && themeId !== 'startup-gradient') {
      console.warn(
        `Theme tokens file for "${themeId}" not found at "${themePath}". ` +
          `Falling back to "startup-gradient" theme.`
      )
      const fallbackPath = join(appPath, 'resources/context/themes', 'startup-gradient.css')
      try {
        themeTokens = await fs.readFile(fallbackPath, 'utf8')
      } catch {
        console.error(
          `Fallback theme "startup-gradient.css" was also not found at "${fallbackPath}". ` +
            `Defaulting to empty theme tokens.`
        )
        themeTokens = `/* Fallback theme: tokens not found */`
      }
    } else {
      console.error(
        `Theme tokens file for "${themeId}" could not be read. ` +
          `Defaulting to empty theme tokens. (Internal error: ${error.message})`
      )
      themeTokens = `/* Fallback theme: tokens not found */`
    }
  }

  // 3. Replace all slot variables:
  //    - {{SLIDE_COUNT}} → config.slideCount.toString()
  //    - {{THEME_TOKENS}} → file contents of the theme CSS
  //    - {{NARRATIVE_TYPE}} → config.narrative
  //    - {{FONT_IMPORT}} → config.theme.fontImport
  const matchedTheme = themes.find((t) => t.id === themeId)
  const fontImportStr = matchedTheme?.fontImport || (config.theme as any)?.fontImport || ''

  const slideCountStr = (config.slideCount ?? 8).toString()
  const narrativeStr = config.narrative || 'explainer'

  let finalPrompt = template
    .replace(/\{\{SLIDE_COUNT\}\}/g, slideCountStr)
    .replace(/\{\{THEME_TOKENS\}\}/g, themeTokens)
    .replace(/\{\{NARRATIVE_TYPE\}\}/g, narrativeStr)
    .replace(/\{\{FONT_IMPORT\}\}/g, fontImportStr)

  if (config.blueprint) {
    finalPrompt +=
      `\n\n---\n## SINGLE SLIDE GENERATION MODE\n` +
      `Overall Presentation Topic: "${config.prompt}"\n` +
      `You must generate EXACTLY ONE raw <section> element for Slide ${config.blueprint.index + 1} of ${config.slideCount}.\n` +
      `Slide Title: "${config.blueprint.title}"\n` +
      `Slide Layout Type: "${config.blueprint.slideType}"\n` +
      `Slide Concept & Bullet Details: ${config.blueprint.concept}\n` +
      `Visual/Image keywords to use in placeholder data-prompt (if applicable): ${config.blueprint.imagePrompt}\n\n` +
      `CRITICAL REQUIREMENT:\n` +
      `- Focus purely on maximizing visual layout styling and rich technical content depth for this specific slide type "${config.blueprint.slideType}" in the context of the overall topic "${config.prompt}".\n` +
      `- Provide extensive, comprehensive, and detailed copy. Do NOT write brief or overly simple sentences. Explain technical mechanics, implementation patterns, and concrete real-world examples (like AWS EC2/S3, Heroku, Salesforce) in full detail.\n` +
      `- Ensure bullet lists use bold lead-ins followed by thorough, educational details (up to 18 words per bullet). Cards must feature a heading and a comprehensive 2-3 sentence paragraph (25-40 words) that fully describes the concept.\n` +
      `- Output ONLY the single <section> tag. No markdown code fences, no trailing prose.\n` +
      `Begin slide HTML now:`
  } else {
    // Append user request details at the very end
    finalPrompt += `\n\n---\n## USER REQUEST\nTopic: ${config.prompt}\nSlides: ${config.slideCount}\nNarrative: ${narrativeStr}\n\nBegin output now:`
  }

  // 4. Log the final prompt length (tokens are ~4 chars, warn if > 4000)
  const charLength = finalPrompt.length
  const estimatedTokens = Math.ceil(charLength / 4)

  console.log(
    `System prompt built successfully. Length: ${charLength} characters, ` +
      `Estimated tokens: ~${estimatedTokens}`
  )

  if (estimatedTokens > 4000) {
    console.warn(
      `Warning: Final system prompt is very large (${estimatedTokens} tokens, > 4000). ` +
        `This might cause increased latency or approach API limits.`
    )
  }

  return finalPrompt
}
