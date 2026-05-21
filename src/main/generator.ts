import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import type { GenerationConfig, Slide, StreamStatus } from '../renderer/src/types'
import { buildSystemPrompt } from './contextLoader'

/**
 * Parse raw Reveal.js slide HTML into a structured Slide object.
 * (Stub implementation - will be fully implemented in a future session).
 */
export function parseSlideHtml(html: string): Slide {
  return {
    id: randomUUID(),
    html,
    title: '',
    notes: '',
    slideType: 'content',
    index: 0
  }
}

/**
 * Helper to identify network-level errors vs. API-level semantic errors.
 */
function isNetworkError(error: any): boolean {
  if (error && typeof error === 'object') {
    // Anthropic API errors carry standard HTTP status codes
    if ('status' in error && typeof error.status === 'number') {
      return false
    }
    // Standard Node.js network connection system errors
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

/**
 * Parses slides incrementally from a buffer.
 * Each slide is enclosed in <section> ... </section>.
 */
function extractCompleteSlides(buffer: string): { slides: string[]; remainder: string } {
  const slides: string[] = []
  let remainder = buffer

  while (true) {
    const startIndex = remainder.indexOf('<section')
    if (startIndex === -1) {
      break
    }

    const endIndex = remainder.indexOf('</section>', startIndex)
    if (endIndex === -1) {
      break
    }

    const endPosition = endIndex + '</section>'.length
    const slideHtml = remainder.slice(startIndex, endPosition)
    slides.push(slideHtml)
    remainder = remainder.slice(endPosition)
  }

  return { slides, remainder }
}

// ─── Overloads to maintain compatibility with ipc.ts call signatures ─────────

export async function generatePresentation(
  config: GenerationConfig,
  apiKey: string,
  signal: AbortSignal,
  onSlide: (slide: Slide) => void
): Promise<void>

export async function generatePresentation(
  config: GenerationConfig,
  apiKey: string,
  onSlide: (slide: Slide) => void,
  onStatus: (status: StreamStatus) => void,
  abortSignal: AbortSignal
): Promise<void>

// ─── Unified Implementation ──────────────────────────────────────────────────

export async function generatePresentation(
  config: GenerationConfig,
  apiKey: string,
  arg3: AbortSignal | ((slide: Slide) => void),
  arg4: ((slide: Slide) => void) | ((status: StreamStatus) => void),
  arg5?: AbortSignal
): Promise<void> {
  let abortSignal: AbortSignal
  let onSlide: (slide: Slide) => void
  let onStatus: (status: StreamStatus) => void

  // Resolve which overload was called and bind correctly
  if (arg3 instanceof AbortSignal || (arg3 && typeof arg3 === 'object' && 'aborted' in arg3)) {
    abortSignal = arg3 as AbortSignal
    onSlide = arg4 as (slide: Slide) => void
    onStatus = () => {} // no-op fallback
  } else {
    onSlide = arg3 as (slide: Slide) => void
    onStatus = arg4 as (status: StreamStatus) => void
    abortSignal = arg5 as AbortSignal
  }

  let attempt = 1
  const maxAttempts = 2

  while (attempt <= maxAttempts) {
    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      // Initialize Anthropic client
      const anthropic = new Anthropic({ apiKey })

      // Call buildSystemPrompt(config) from contextLoader
      const systemPrompt = await buildSystemPrompt(config)

      // Send status update: state 'generating', slidesGenerated: 0
      onStatus({
        state: 'generating',
        slidesGenerated: 0,
        totalSlides: config.slideCount
      })

      // Call anthropic.messages.stream()
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: config.prompt }]
      })

      let buffer = ''
      let count = 0

      // Streaming loop
      for await (const chunk of stream) {
        if (abortSignal.aborted) {
          throw new Error('AbortError')
        }

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          buffer += chunk.delta.text

          const { slides, remainder } = extractCompleteSlides(buffer)
          buffer = remainder

          for (const slideHtml of slides) {
            if (abortSignal.aborted) {
              throw new Error('AbortError')
            }

            const parsedSlide = parseSlideHtml(slideHtml)
            parsedSlide.index = count

            onSlide(parsedSlide)

            onStatus({
              state: 'generating',
              slidesGenerated: ++count,
              totalSlides: config.slideCount
            })
          }
        }
      }

      // Process any remaining buffer content after stream ends
      const { slides: finalSlides } = extractCompleteSlides(buffer)
      for (const slideHtml of finalSlides) {
        if (abortSignal.aborted) {
          throw new Error('AbortError')
        }

        const parsedSlide = parseSlideHtml(slideHtml)
        parsedSlide.index = count

        onSlide(parsedSlide)

        onStatus({
          state: 'generating',
          slidesGenerated: ++count,
          totalSlides: config.slideCount
        })
      }

      // Send final status: state 'done'
      onStatus({
        state: 'done',
        slidesGenerated: count,
        totalSlides: config.slideCount
      })

      break // Success, exit retry loop
    } catch (error: any) {
      if (abortSignal.aborted || error.message === 'AbortError') {
        console.log('Stream generation aborted by user.')
        onStatus({
          state: 'idle',
          slidesGenerated: 0,
          totalSlides: config.slideCount
        })
        break // Graceful abort
      }

      const isNetErr = isNetworkError(error)
      if (isNetErr && attempt < maxAttempts) {
        console.warn(
          `Network error encountered (Attempt ${attempt}/${maxAttempts}): ${error.message || error}. Retrying once...`
        )
        attempt++
        continue
      }

      // Log error and report final 'error' status
      const message = error instanceof Error ? error.message : 'Unknown generation error'
      console.error(`Claude generation stream failed: ${message}`, error)

      onStatus({
        state: 'error',
        slidesGenerated: 0,
        totalSlides: config.slideCount,
        errorMessage: message
      })
      break
    } finally {
      // Clean up / finalize
    }
  }
}
