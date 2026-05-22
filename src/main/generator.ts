import Anthropic from '@anthropic-ai/sdk'
import type {
  GenerationConfig,
  Slide,
  StreamStatus,
  Presentation,
  AppSettings
} from '../renderer/src/types'
import { buildSystemPrompt } from './contextLoader'
import { parseSlideHtml, extractCompleteSlides } from './slideParser'
import { generateWithCLI, runResearchWithCLI } from './cliRunner'
import { scanInstalledCLIs } from './cliScanner'

/**
 * Helper to identify network-level errors vs. API-level semantic errors.
 */
function isNetworkError(error: any): boolean {
  if (error && typeof error === 'object') {
    if ('status' in error && typeof error.status === 'number') {
      return false
    }
    const systemErrorCodes = [
      'ENOTFOUND',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      'EAI_AGAIN'
    ]
    if (
      'code' in error &&
      typeof error.code === 'string' &&
      systemErrorCodes.includes(error.code)
    ) {
      return true
    }
  }
  const errMsg = String(error?.message || '').toLowerCase()
  return (
    errMsg.includes('fetch failed') ||
    errMsg.includes('network error') ||
    errMsg.includes('timeout')
  )
}

// ─── Overloads to maintain compatibility with calling code ─────────────────

export async function generatePresentation(
  config: GenerationConfig,
  settings: AppSettings,
  signal: AbortSignal,
  onSlide: (slide: Slide) => void
): Promise<void>

export async function generatePresentation(
  config: GenerationConfig,
  settings: AppSettings,
  onSlide: (slide: Slide) => void,
  onStatus: (status: StreamStatus) => void,
  abortSignal: AbortSignal
): Promise<void>

// ─── Unified Implementation ──────────────────────────────────────────────────

export async function generatePresentation(
  config: GenerationConfig,
  settings: AppSettings,
  arg3: AbortSignal | ((slide: Slide) => void),
  arg4: ((slide: Slide) => void) | ((status: StreamStatus) => void),
  arg5?: AbortSignal
): Promise<void> {
  let abortSignal: AbortSignal
  let onSlide: (slide: Slide) => void
  let onStatus: (status: StreamStatus) => void

  if (arg3 instanceof AbortSignal || (arg3 && typeof arg3 === 'object' && 'aborted' in arg3)) {
    abortSignal = arg3 as AbortSignal
    onSlide = arg4 as (slide: Slide) => void
    onStatus = () => {}
  } else {
    onSlide = arg3 as (slide: Slide) => void
    onStatus = arg4 as (status: StreamStatus) => void
    abortSignal = arg5 as AbortSignal
  }

  // ── ROUTE TO EXECUTION MODE ──────────────────────────────────────────────

  if (settings.executionMode === 'local-cli') {
    const clis = await scanInstalledCLIs()
    const selected = clis.find((c) => c.id === settings.selectedCliId)

    if (!selected || !selected.installed || !selected.executablePath) {
      throw new Error(`Selected CLI agent "${settings.selectedCliId}" not found or not installed.`)
    }

    // Step 1: Research Pass
    onStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    let researchOutline = ''
    try {
      researchOutline = await runResearchWithCLI(
        config,
        selected.executablePath,
        selected.id,
        abortSignal
      )
    } catch (researchErr) {
      console.warn(
        '[generator] CLI Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }

    if (abortSignal.aborted) {
      onStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
      return
    }

    // Step 2: Slide Layout Generation
    const configWithOutline = {
      ...config,
      prompt: researchOutline
        ? `Here is a detailed research blueprint outline for the presentation:\n\n${researchOutline}\n\nUse this research outline to guide the slide generation. Ensure you generate exactly ${config.slideCount} slides with high-fidelity Reveal.js structures matching the blueprint.\n\nOriginal prompt: ${config.prompt}`
        : config.prompt
    }

    return generateWithCLI(
      configWithOutline,
      selected.executablePath,
      selected.id,
      onSlide,
      onStatus,
      abortSignal
    )
  }

  // ── ANTHROPIC API MODE ────────────────────────────────────────────────────

  let attempt = 1
  const maxAttempts = 2
  let researchOutline = ''

  if (settings.executionMode === 'anthropic-api') {
    // Step 1: Research Pass
    onStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }
      const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Output only structured markdown ideas. No HTML, no reveal.js code.`
      const researchResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: researchSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please research and build a detailed ${config.slideCount}-slide presentation plan.`
          }
        ]
      })
      if (
        researchResponse.content &&
        researchResponse.content[0] &&
        researchResponse.content[0].type === 'text'
      ) {
        researchOutline = researchResponse.content[0].text
      }
    } catch (researchErr: any) {
      if (researchErr.message === 'AbortError' || abortSignal.aborted) {
        onStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        return
      }
      console.warn(
        '[generator] API Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }
  }

  while (attempt <= maxAttempts) {
    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
      const systemPrompt = await buildSystemPrompt(config)

      onStatus({
        state: 'generating',
        slidesGenerated: 0,
        totalSlides: config.slideCount
      })

      const finalUserPrompt = researchOutline
        ? `Here is a detailed research blueprint outline for the presentation:\n\n${researchOutline}\n\nUse this research outline to guide the slide generation. Ensure you generate exactly ${config.slideCount} slides with high-fidelity Reveal.js structures matching the blueprint.\n\nOriginal prompt: ${config.prompt}`
        : config.prompt

      const stream = await anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: finalUserPrompt }]
      })

      let buffer = ''
      let count = 0

      for await (const chunk of stream) {
        if (abortSignal.aborted) throw new Error('AbortError')

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          buffer += chunk.delta.text
          const [completeSlides, remainder] = extractCompleteSlides(buffer)
          buffer = remainder

          for (const html of completeSlides) {
            if (abortSignal.aborted) throw new Error('AbortError')
            onSlide(parseSlideHtml(html, count++))
            onStatus({
              state: 'generating',
              slidesGenerated: count,
              totalSlides: config.slideCount
            })
          }
        }
      }

      // Final check for leftover buffer
      if (buffer.includes('<section')) {
        onSlide(parseSlideHtml(buffer, count++))
      }

      onStatus({
        state: 'done',
        slidesGenerated: count,
        totalSlides: config.slideCount
      })

      break
    } catch (error: any) {
      if (abortSignal.aborted || error.message === 'AbortError') {
        onStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        break
      }

      if (isNetworkError(error) && attempt < maxAttempts) {
        attempt++
        continue
      }

      onStatus({
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount,
        errorMessage: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}

/**
 * Single Slide Regeneration
 */
export async function regenerateSlide(
  slideIndex: number,
  currentPresentation: Presentation,
  settings: AppSettings,
  onResult: (slide: Slide) => void
): Promise<void> {
  const themeId = currentPresentation.theme
  const matchedTheme =
    (await import('../renderer/src/lib/themes')).themes.find((t) => t.id === themeId) ||
    (await import('../renderer/src/lib/themes')).themes[0]

  const pseudoConfig: GenerationConfig = {
    prompt: currentPresentation.prompt,
    theme: matchedTheme,
    slideCount: currentPresentation.slides.length
  }

  const slideToRegen = currentPresentation.slides[slideIndex]
  if (!slideToRegen) throw new Error(`Slide at index ${slideIndex} not found.`)

  const userPrompt = `Rewrite only slide ${slideIndex + 1} (${slideToRegen.slideType}: ${slideToRegen.title}) for this presentation about: ${currentPresentation.prompt}. Output only one <section> tag.`

  if (settings.executionMode === 'local-cli') {
    const clis = await scanInstalledCLIs()
    const selected = clis.find((c) => c.id === settings.selectedCliId)
    if (!selected || !selected.installed || !selected.executablePath) {
      throw new Error(`Selected CLI agent "${settings.selectedCliId}" not found.`)
    }

    const abortController = new AbortController()
    return generateWithCLI(
      { ...pseudoConfig, prompt: userPrompt },
      selected.executablePath,
      selected.id,
      onResult,
      () => {},
      abortController.signal
    )
  }

  const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
  const systemPrompt = await buildSystemPrompt(pseudoConfig)

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })

  let responseText = ''
  if (response.content && response.content[0] && response.content[0].type === 'text') {
    responseText = response.content[0].text
  }

  let sectionHtml = responseText
  const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
  if (match) {
    sectionHtml = match[0]
  }

  onResult(parseSlideHtml(sectionHtml, slideIndex))
}
