import Anthropic from '@anthropic-ai/sdk'
import { JSDOM } from 'jsdom'
import type {
  GenerationConfig,
  Slide,
  StreamStatus,
  Presentation,
  AppSettings,
  SlideBlueprint
} from '../renderer/src/types'
import { buildSystemPrompt } from './contextLoader'
import { parseSlideHtml, extractCompleteSlides } from './slideParser'
import {
  generateWithCLI,
  runResearchWithCLI,
  runMusicQueryWithCLI,
  runChunkResearchWithCLI
} from './cliRunner'
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

/**
 * A simple zero-dependency class to limit concurrent async executions.
 */
class ConcurrencyLimiter {
  private activeCount = 0
  private queue: (() => void)[] = []
  constructor(private limit: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.activeCount++
    try {
      return await fn()
    } finally {
      this.activeCount--
      const next = this.queue.shift()
      if (next) next()
    }
  }
}

/**
 * Builds a robust system prompt for the research outlining phase.
 */
function buildResearchSystemPrompt(config: GenerationConfig): string {
  const slideCount = config.slideCount || 8
  const targetImageCount = Math.max(1, Math.round(slideCount * 0.3))

  return `You are a professional presentation researcher and blueprint planner.
Your task is to perform deep research and create a detailed slide-by-slide concepts and layouts plan for a ${slideCount}-slide presentation about: "${config.prompt}".
Narrative style: "${config.narrative || 'explainer'}".

CRITICAL IMAGE AND LAYOUT RULES:
1. Visual Diversity & Balanced Density:
    - Out of exactly ${slideCount} slides, exactly ${targetImageCount} slides (about 30% of the deck, e.g. exactly 3 slides in a 10-slide deck, or 2 slides in a 6-8 slide deck, or 4 slides in a 12-slide deck) MUST use image-oriented layouts to introduce high-fidelity visuals.
    - Designate these visual slides with layout Type: 'image'.
    - The remaining ~70% of the slides MUST use text/bullet/data/quote layouts (such as 'content', 'split', 'data', 'stat', 'quote', 'cta', 'title') to keep the presentation clean, premium, and readable. Do NOT put images or image prompts on these normal slides.
    - Distribute the image slides naturally and randomly across the body slides (exclude Slide 1 title and the final Slide N close/cta).
 
2. Topic-Relevant Image Prompts:
    - For the ${targetImageCount} designated visual slides (which MUST have Type: 'image'), you MUST write a highly descriptive prompt in the Image: field for the AI image generator.
    - The prompt MUST be highly relevant to the specific slide content and presentation topic (e.g. for "Cloud Computing", describe server racks, networking nodes, data streaming, tech overlays, digital security locks, fiber optic cables in modern professional, sleek tech styling).
    - Never describe animals, cats, cartoon characters, or irrelevant objects. Make them sound extremely professional and modern.
 
3. Strict Output Format:
    - Output ONLY structured markdown. Do NOT output any HTML code or Reveal.js tags.
    - For each slide, you MUST follow this exact template:
 
Slide [Number]
Title: [Slide Title]
Type: [title | content | split | data | cta | image | stat | quote]
Concept: [Brief description of the core concepts and points to cover]
Image: [Only if layout Type is 'image', provide a descriptive, topic-relevant AI image prompt; otherwise, omit this field entirely]

Begin slide plan now:`
}

/**
 * Resiliently parses a research outline into an array of slide blueprints.
 */
function parseResearchBlueprint(
  outlineText: string,
  expectedCount: number,
  prompt: string
): SlideBlueprint[] {
  const blueprints: SlideBlueprint[] = []

  // Split by headers or slide bullet groups
  const sections = outlineText.split(
    /(?:^|\n)(?:Slide\s*\d+|#+\s*Slide\s*\d+|-\s*\*?Slide\s*\d+\*?):?/gi
  )

  // Filter out any empty prelude
  const sectionContents = sections.slice(1)

  // Check if we got an empty outline or fallback prompt and need to generate fallback blueprints
  if (sectionContents.length === 0) {
    const cleanPrompt = prompt.replace(/["'\r\n]/g, '').trim()
    for (let i = 0; i < expectedCount; i++) {
      let title = ''
      let slideType: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote' = 'content'
      let concept = ''
      let imagePrompt = ''

      if (i === 0) {
        title = cleanPrompt.substring(0, 50)
        slideType = 'title'
        concept = `Introduce the presentation topic: "${cleanPrompt}". Provide a high-level overview and outline the importance of the subject.`
      } else if (i === expectedCount - 1) {
        title = 'Conclusion & Next Steps'
        slideType = 'cta'
        concept = `Summarize key takeaways for "${cleanPrompt}". Provide concrete next steps and a clear call-to-action.`
      } else {
        const topics = [
          'Core Foundations',
          'Key Architecture',
          'Technical Mechanics',
          'Real-world Benefits',
          'Data & Metrics',
          'Industry Standards',
          'Future Outlook',
          'Strategic Implementation'
        ]
        const topic = topics[(i - 1) % topics.length]
        title = `${topic} of ${cleanPrompt.substring(0, 30)}`

        // Enforce 1 image for every 5 pages. Index i is 0-based.
        // E.g., if i is 4, 9, 14, etc. (which corresponds to Slide 5, 10, 15...)
        if ((i + 1) % 5 === 0) {
          slideType = 'image'
          imagePrompt = `${title} visual representation, professional sleek technology layout, high quality`
          concept = `Explain the visual concept of "${title}". Outline the key visual components and their relation to "${cleanPrompt}".`
        } else {
          // Cycle other layout types for variety
          const otherTypes: ('content' | 'split' | 'data' | 'stat' | 'quote')[] = [
            'content',
            'split',
            'data',
            'stat',
            'quote'
          ]
          slideType = otherTypes[(i - 1) % otherTypes.length]
          concept = `Detail and explain the "${title}". Provide detailed descriptions, real-world examples (like AWS, Heroku, or Salesforce), and technical parameters of "${cleanPrompt}".`
        }
      }

      blueprints.push({
        index: i,
        title,
        slideType,
        concept,
        imagePrompt
      })
    }
    return blueprints
  }

  for (let i = 0; i < expectedCount; i++) {
    const rawContent = sectionContents[i] || ''

    // Fallbacks
    let title = ''
    let slideType: 'title' | 'content' | 'split' | 'data' | 'cta' | 'image' | 'stat' | 'quote' =
      'content'
    let concept = ''
    let imagePrompt = ''

    if (rawContent) {
      // 1. Extract title: look for Title: or first line/header
      const titleMatch = /Title:\s*\*?([^\n\r]+)/i.exec(rawContent)
      if (titleMatch) {
        title = titleMatch[1].replace(/[*_]/g, '').trim()
      } else {
        const firstLine = rawContent.trim().split('\n')[0] || ''
        title = firstLine.replace(/[*_#]/g, '').trim()
      }

      // 2. Extract Type
      const typeMatch =
        /(?:Type|Layout|Archetype):\s*\*?(title|content|split|data|cta|image|stat|quote)/i.exec(
          rawContent
        )
      if (typeMatch) {
        slideType = typeMatch[1].toLowerCase() as any
      } else {
        // Guess based on content keywords
        const lower = rawContent.toLowerCase()
        if (lower.includes('comparison') || lower.includes('split') || lower.includes('vs')) {
          slideType = 'split'
        } else if (
          lower.includes('dashboard') ||
          lower.includes('table') ||
          lower.includes('chart') ||
          lower.includes('metrics')
        ) {
          slideType = 'data'
        } else if (
          lower.includes('stat') ||
          lower.includes('number') ||
          lower.includes('percent')
        ) {
          slideType = 'stat'
        } else if (lower.includes('quote') || lower.includes('testimonial')) {
          slideType = 'quote'
        } else if (lower.includes('cta') || lower.includes('action') || lower.includes('closing')) {
          slideType = 'cta'
        } else if (
          lower.includes('image') ||
          lower.includes('photo') ||
          lower.includes('illustration')
        ) {
          slideType = 'image'
        } else if (i === 0) {
          slideType = 'title'
        }
      }

      // 3. Extract Concept / Keywords
      const conceptMatch = /(?:Concept|Detail|Points):\s*\*?([^\n\r]+)/i.exec(rawContent)
      if (conceptMatch) {
        concept = conceptMatch[1].trim()
      } else {
        concept = rawContent
          .replace(/Title:[^\n]+/i, '')
          .replace(/Type:[^\n]+/i, '')
          .trim()
      }

      // 4. Extract Image Prompt keywords
      const imageMatch = /(?:Image|Prompt|Visual):\s*\*?([^\n\r]+)/i.exec(rawContent)
      if (imageMatch) {
        imagePrompt = imageMatch[1].trim()
      }
    }

    // Guarantee basic default titles
    if (!title || title.length < 2) {
      const cleanPrompt = prompt.replace(/["'\r\n]/g, '').trim().substring(0, 30)
      if (i === 0) title = cleanPrompt
      else if (i === expectedCount - 1) title = 'Conclusion & Next Steps'
      else title = `Key Aspect ${i + 1} of ${cleanPrompt}`
    }

    blueprints.push({
      index: i,
      title,
      slideType,
      concept: concept || `Core details for slide ${i + 1}`,
      imagePrompt:
        imagePrompt || (slideType === 'image' ? `${title} modern professional background` : '')
    })
  }

  return blueprints
}

/**
 * Resiliently parses the deep research output for a chunk of slides and assigns
 * the parsed concept to the corresponding SlideBlueprint.
 */
function parseChunkResearchOutput(text: string, chunk: SlideBlueprint[]): void {
  const matches: { index: number; slideNum: number; length: number }[] = []
  const regex = /(?:^|\n)(?:Slide\s*(\d+)|#+\s*Slide\s*(\d+)|-\s*\*?Slide\s*(\d+)\*?):?/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const slideNumStr = match[1] || match[2] || match[3]
    const slideNum = parseInt(slideNumStr, 10)
    if (!isNaN(slideNum)) {
      matches.push({
        index: match.index,
        slideNum,
        length: match[0].length
      })
    }
  }

  // Map of slideIndex -> concept content
  const parsedConcepts = new Map<number, string>()

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const start = current.index + current.length
    const end = next ? next.index : text.length
    const rawContent = text.slice(start, end).trim()

    // Resiliently extract from "Concept: [content]" or fallback to whole content
    let concept = ''
    const conceptMatch = /(?:Concept|Detail|Points|Details):\s*\*?([\s\S]+)/i.exec(rawContent)
    if (conceptMatch) {
      concept = conceptMatch[1].trim()
    } else {
      concept = rawContent
        .replace(/^\s*\*?(?:Concept|Detail|Points|Details)?\s*:\s*\*?/gi, '')
        .trim()
    }

    if (concept) {
      parsedConcepts.set(current.slideNum - 1, concept)
    }
  }

  // Populate blueprints in this chunk
  for (const blueprint of chunk) {
    const foundConcept = parsedConcepts.get(blueprint.index)
    if (foundConcept) {
      blueprint.concept = foundConcept
    } else {
      console.warn(
        `[generator] Chunk research parser could not find concept for Slide ${blueprint.index + 1}. Keeping outline fallback.`
      )
    }
  }
}

async function streamOpenAiCompatible(
  url: string,
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  finalUserPrompt: string,
  wrappedOnSlide: (slide: Slide) => void,
  wrappedOnStatus: (status: StreamStatus) => void,
  abortSignal: AbortSignal,
  config: GenerationConfig
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserPrompt }
      ],
      stream: true
    }),
    signal: abortSignal
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const reader = response.body
  if (!reader) throw new Error('Response body is null')

  let buffer = ''
  let count = 0
  let slideBuffer = ''

  for await (const chunk of reader) {
    if (abortSignal.aborted) throw new Error('AbortError')
    const chunkStr = new TextDecoder('utf-8').decode(chunk as any)
    buffer += chunkStr

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const cleaned = line.trim()
      if (!cleaned) continue
      if (cleaned === 'data: [DONE]') continue
      if (cleaned.startsWith('data: ')) {
        try {
          const jsonStr = cleaned.slice(6)
          const parsed = JSON.parse(jsonStr)
          const text = parsed.choices?.[0]?.delta?.content || ''
          if (text) {
            slideBuffer += text
            const [completeSlides, remainder] = extractCompleteSlides(slideBuffer)
            slideBuffer = remainder

            for (const html of completeSlides) {
              if (abortSignal.aborted) throw new Error('AbortError')
              wrappedOnSlide(parseSlideHtml(html, count++))
              wrappedOnStatus({
                state: 'generating',
                slidesGenerated: count,
                totalSlides: config.slideCount
              })
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  }

  if (slideBuffer.includes('<section')) {
    wrappedOnSlide(parseSlideHtml(slideBuffer, count++))
  }

  wrappedOnStatus({
    state: 'done',
    slidesGenerated: count,
    totalSlides: config.slideCount
  })
}

async function regenerateSlideOpenAiCompatible(
  url: string,
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1024
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  const resJson: any = await response.json()
  return resJson?.choices?.[0]?.message?.content || ''
}

async function queryOpenAiCompatibleMusic(
  url: string,
  apiKey: string,
  modelName: string,
  prompt: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI Music Selector. Respond with ONLY the exact track key from the provided list, with no other text.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 20
    }),
    signal: abortSignal
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const resJson: any = await response.json()
  return resJson?.choices?.[0]?.message?.content || ''
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

  const imagePromises: Promise<any>[] = []
  let bgMusicBase64: string | undefined = undefined

  const wrappedOnStatus = (status: StreamStatus) => {
    if (status.state === 'done') {
      ;(async () => {
        try {
          if (imagePromises.length > 0) {
            // Emit 'imaging' state so the UI shows progress instead of appearing frozen
            let imagesCompleted = 0
            const total = imagePromises.length
            onStatus({
              state: 'imaging',
              slidesGenerated: status.slidesGenerated,
              totalSlides: status.totalSlides,
              imagesGenerated: 0,
              totalImages: total
            })

            // Race each image promise against a 50-second hard timeout
            const safeImagePromises = imagePromises.map((p) =>
              Promise.race([
                p.then(() => {
                  imagesCompleted++
                  onStatus({
                    state: 'imaging',
                    slidesGenerated: status.slidesGenerated,
                    totalSlides: status.totalSlides,
                    imagesGenerated: imagesCompleted,
                    totalImages: total
                  })
                }),
                new Promise<void>((resolve) => setTimeout(resolve, 50000))
              ])
            )

            await Promise.allSettled(safeImagePromises)
          }
          if (config.generateBgMusic) {
            bgMusicBase64 = await fetchMusicBase64(
              config.theme.id,
              config.prompt,
              settings,
              abortSignal
            )
          }
        } catch (e) {
          console.error('[generator] Error waiting for assets/music:', e)
        } finally {
          onStatus({
            ...status,
            state: 'done',
            bgMusicUrl: bgMusicBase64
          })
        }
      })()
    } else {
      onStatus(status)
    }
  }

  const imageLimiter = new ConcurrencyLimiter(6)
  const triggeredImageIndices = new Set<number>()

  const wrappedOnSlide = (slide: Slide) => {
    // Only image generation runs per-slide during streaming.
    // Voiceover is generated offline via the kokoro-js IPC handler
    // (`generate-voiceovers`) after the full presentation is saved.
    if (config.generateImages) {
      // Check if the slide explicitly contains an image placeholder or is of type 'image'
      const hasPlaceholder =
        (slide.html && /class\s*=\s*["'][^"']*og-image-placeholder[^"']*["']/i.test(slide.html)) ||
        slide.slideType === 'image'

      if (hasPlaceholder) {
        // Prevent duplicate image generation runs for the same slide index!
        if (triggeredImageIndices.has(slide.index)) {
          console.log(
            `[generator] Image generation already triggered for slide index ${slide.index}. Skipping duplicate trigger.`
          )
          return
        }
        triggeredImageIndices.add(slide.index)

        // Send the initial placeholder slide to the renderer so it shows the shimmer
        onSlide(slide)

        const assetTask = imageLimiter.run(async () => {
          if (abortSignal.aborted) return
          await generateAndInjectImage(slide, config, settings, onSlide, abortSignal).catch(
            (err) => {
              console.error('[generator] Image generation failed:', err)
            }
          )
        })
        imagePromises.push(assetTask)
        return
      }
    }

    // For normal slides or if image generation is disabled
    onSlide(slide)
  }

  // ── ROUTE TO EXECUTION MODE ──────────────────────────────────────────────

  if (settings.executionMode === 'local-cli') {
    const clis = await scanInstalledCLIs()
    const selected = clis.find((c) => c.id === settings.selectedCliId)

    if (!selected || !selected.installed || !selected.executablePath) {
      throw new Error(`Selected CLI agent "${settings.selectedCliId}" not found or not installed.`)
    }

    // Step 1: Research Pass
    wrappedOnStatus({
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
        abortSignal,
        settings
      )
    } catch (researchErr) {
      console.warn(
        '[generator] CLI Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }

    if (abortSignal.aborted) {
      wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
      return
    }

    // Step 2: Slide Layout Generation (Modular Slide-by-Slide)
    const blueprints = parseResearchBlueprint(researchOutline || config.prompt, config.slideCount, config.prompt)
    console.log(`[generator] Parsed ${blueprints.length} slide blueprints for modular generation.`)

    // Step 3: Chunk-Based Deep Research
    const chunks: SlideBlueprint[][] = []
    const chunkSize = 5
    for (let i = 0; i < blueprints.length; i += chunkSize) {
      chunks.push(blueprints.slice(i, i + chunkSize))
    }

    console.log(
      `[generator] Grouped slides into ${chunks.length} chunks for deep research (chunk size: ${chunkSize}).`
    )

    const chunkLimiter = new ConcurrencyLimiter(2)
    const chunkTasks = chunks.map(async (chunk, chunkIdx) => {
      if (abortSignal.aborted) return
      await chunkLimiter.run(async () => {
        if (abortSignal.aborted) return
        try {
          console.log(
            `[generator] Starting chunk deep research for Chunk ${chunkIdx + 1}/${chunks.length} (Slides ${chunk.map((s) => s.index + 1).join(', ')})`
          )
          const chunkResearchText = await runChunkResearchWithCLI(
            config,
            chunk,
            chunkIdx,
            selected.executablePath!,
            selected.id,
            abortSignal,
            settings
          )
          console.log(
            `[generator] Completed chunk deep research for Chunk ${chunkIdx + 1}. Research text length: ${chunkResearchText.length}`
          )
          parseChunkResearchOutput(chunkResearchText, chunk)
        } catch (researchErr) {
          console.warn(
            `[generator] Chunk deep research failed for Chunk ${chunkIdx + 1}, using blueprints outline concepts fallback:`,
            researchErr
          )
        }
      })
    })

    await Promise.all(chunkTasks)

    if (abortSignal.aborted) {
      wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
      return
    }

    // Step 4: Parallel HTML Generation
    wrappedOnStatus({
      state: 'generating',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    const slideLimiter = new ConcurrencyLimiter(2)
    let completedSlides = 0
    let successfulSlidesCount = 0
    const errors: { index: number; error: any }[] = []

    const slideTasks = blueprints.map(async (blueprint) => {
      if (abortSignal.aborted) return

      await slideLimiter.run(async () => {
        if (abortSignal.aborted) return

        const slideConfig: GenerationConfig = {
          ...config,
          blueprint
        }

        let isSuccessful = false
        try {
          await generateWithCLI(
            slideConfig,
            selected.executablePath!,
            selected.id,
            (slide) => {
              slide.index = blueprint.index
              ;(slide as any).imagePrompt = blueprint.imagePrompt
              wrappedOnSlide(slide)
              isSuccessful = true
            },
            () => {}, // Silence sub-process status changes
            abortSignal,
            settings
          )
        } catch (err) {
          console.error(`[generator] Slide ${blueprint.index + 1} generation failed:`, err)
          errors.push({ index: blueprint.index, error: err })
        }

        if (isSuccessful) {
          successfulSlidesCount++
        }
        completedSlides++
        wrappedOnStatus({
          state: 'generating',
          slidesGenerated: completedSlides,
          totalSlides: config.slideCount
        })
      })
    })

    await Promise.all(slideTasks)

    if (abortSignal.aborted) {
      wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
      return
    }

    if (successfulSlidesCount === 0) {
      const firstErr = errors[0]?.error
      const errorMsg = firstErr instanceof Error ? firstErr.message : String(firstErr || 'Slide generation failed completely')
      throw new Error(`All slide generations failed.\n\n${errorMsg}`)
    }

    wrappedOnStatus({
      state: 'done',
      slidesGenerated: successfulSlidesCount,
      totalSlides: config.slideCount
    })
    return
  }

  // ── ANTHROPIC API MODE ────────────────────────────────────────────────────

  let attempt = 1
  const maxAttempts = 2
  let researchOutline = ''

  if (settings.executionMode === 'gemini-api') {
    // Step 1: Research Pass for Gemini
    wrappedOnStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      const researchSystemPrompt = buildResearchSystemPrompt(config)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${researchSystemPrompt}\n\nPlease research and build a detailed ${config.slideCount}-slide presentation plan.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        }),
        signal: abortSignal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const resJson: any = await response.json()
      const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        researchOutline = text
      }
    } catch (researchErr: any) {
      if (researchErr.message === 'AbortError' || abortSignal.aborted) {
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        return
      }
      console.warn(
        '[generator] Gemini API Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }
  }

  if (settings.executionMode === 'openai-api') {
    // Step 1: Research Pass for OpenAI
    wrappedOnStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      const researchSystemPrompt = buildResearchSystemPrompt(config)
      const url = 'https://api.openai.com/v1/chat/completions'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: researchSystemPrompt },
            {
              role: 'user',
              content: `Please research and build a detailed ${config.slideCount}-slide presentation plan.`
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: abortSignal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const resJson: any = await response.json()
      const text = resJson?.choices?.[0]?.message?.content
      if (text) {
        researchOutline = text
      }
    } catch (researchErr: any) {
      if (researchErr.message === 'AbortError' || abortSignal.aborted) {
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        return
      }
      console.warn(
        '[generator] OpenAI API Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }
  }

  if (settings.executionMode === 'deepseek-api') {
    // Step 1: Research Pass for DeepSeek
    wrappedOnStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      const researchSystemPrompt = buildResearchSystemPrompt(config)
      const url = 'https://api.deepseek.com/chat/completions'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: researchSystemPrompt },
            {
              role: 'user',
              content: `Please research and build a detailed ${config.slideCount}-slide presentation plan.`
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: abortSignal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const resJson: any = await response.json()
      const text = resJson?.choices?.[0]?.message?.content
      if (text) {
        researchOutline = text
      }
    } catch (researchErr: any) {
      if (researchErr.message === 'AbortError' || abortSignal.aborted) {
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        return
      }
      console.warn(
        '[generator] DeepSeek API Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }
  }

  if (settings.executionMode === 'groq-api') {
    // Step 1: Research Pass for Groq
    wrappedOnStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }

      const researchSystemPrompt = buildResearchSystemPrompt(config)
      const url = 'https://api.groq.com/openai/v1/chat/completions'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: researchSystemPrompt },
            {
              role: 'user',
              content: `Please research and build a detailed ${config.slideCount}-slide presentation plan.`
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: abortSignal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const resJson: any = await response.json()
      const text = resJson?.choices?.[0]?.message?.content
      if (text) {
        researchOutline = text
      }
    } catch (researchErr: any) {
      if (researchErr.message === 'AbortError' || abortSignal.aborted) {
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        return
      }
      console.warn(
        '[generator] Groq API Research pass failed, falling back to direct prompt:',
        researchErr
      )
    }
  }

  if (settings.executionMode === 'anthropic-api') {
    // Step 1: Research Pass
    wrappedOnStatus({
      state: 'researching',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    try {
      if (abortSignal.aborted) {
        throw new Error('AbortError')
      }
      const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
      const researchSystemPrompt = buildResearchSystemPrompt(config)
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
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
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

      const systemPrompt = await buildSystemPrompt(config)

      wrappedOnStatus({
        state: 'generating',
        slidesGenerated: 0,
        totalSlides: config.slideCount
      })

      const finalUserPrompt = researchOutline
        ? `Here is a detailed research blueprint outline for the presentation:\n\n${researchOutline}\n\nUse this research outline to guide the slide generation. Ensure you generate exactly ${config.slideCount} slides with high-fidelity Reveal.js structures matching the blueprint.\n\nOriginal prompt: ${config.prompt}`
        : config.prompt

      if (settings.executionMode === 'gemini-api') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${settings.geminiApiKey}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n---\n\nUser Request: ${finalUserPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192
            }
          }),
          signal: abortSignal
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
        }

        const resJson: any = await response.json()
        const responseText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''

        let buffer = responseText
        let count = 0
        const [completeSlides, remainder] = extractCompleteSlides(buffer)
        buffer = remainder

        for (const html of completeSlides) {
          if (abortSignal.aborted) throw new Error('AbortError')
          wrappedOnSlide(parseSlideHtml(html, count++))
          wrappedOnStatus({
            state: 'generating',
            slidesGenerated: count,
            totalSlides: config.slideCount
          })
        }

        // Final check for leftover buffer
        if (buffer.includes('<section')) {
          wrappedOnSlide(parseSlideHtml(buffer, count++))
        }

        wrappedOnStatus({
          state: 'done',
          slidesGenerated: count,
          totalSlides: config.slideCount
        })
        break
      } else if (settings.executionMode === 'openai-api') {
        await streamOpenAiCompatible(
          'https://api.openai.com/v1/chat/completions',
          settings.openaiApiKey || '',
          'gpt-4o',
          systemPrompt,
          finalUserPrompt,
          wrappedOnSlide,
          wrappedOnStatus,
          abortSignal,
          config
        )
        break
      } else if (settings.executionMode === 'deepseek-api') {
        await streamOpenAiCompatible(
          'https://api.deepseek.com/chat/completions',
          settings.deepseekApiKey || '',
          'deepseek-chat',
          systemPrompt,
          finalUserPrompt,
          wrappedOnSlide,
          wrappedOnStatus,
          abortSignal,
          config
        )
        break
      } else if (settings.executionMode === 'groq-api') {
        await streamOpenAiCompatible(
          'https://api.groq.com/openai/v1/chat/completions',
          settings.groqApiKey || '',
          'llama-3.3-70b-versatile',
          systemPrompt,
          finalUserPrompt,
          wrappedOnSlide,
          wrappedOnStatus,
          abortSignal,
          config
        )
        break
      } else {
        const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
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
              wrappedOnSlide(parseSlideHtml(html, count++))
              wrappedOnStatus({
                state: 'generating',
                slidesGenerated: count,
                totalSlides: config.slideCount
              })
            }
          }
        }

        // Final check for leftover buffer
        if (buffer.includes('<section')) {
          wrappedOnSlide(parseSlideHtml(buffer, count++))
        }

        wrappedOnStatus({
          state: 'done',
          slidesGenerated: count,
          totalSlides: config.slideCount
        })

        break
      }
    } catch (error: any) {
      if (abortSignal.aborted || error.message === 'AbortError') {
        wrappedOnStatus({ state: 'idle', slidesGenerated: 0, totalSlides: config.slideCount })
        break
      }

      if (isNetworkError(error) && attempt < maxAttempts) {
        attempt++
        continue
      }

      wrappedOnStatus({
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

  const wrappedOnResult = async (newSlide: Slide) => {
    if (
      newSlide.slideType === 'image' ||
      /class\s*=\s*["'][^"']*og-image-placeholder[^"']*["']/i.test(newSlide.html)
    ) {
      try {
        console.log(
          `[generator] Slide regeneration produced image slide or placeholder. Generating image...`
        )
        await generateAndInjectImage(newSlide, pseudoConfig, settings, onResult)
      } catch (err) {
        console.error('[generator] Image generation failed for regenerated slide:', err)
        onResult(newSlide)
      }
    } else {
      onResult(newSlide)
    }
  }

  const slideToRegen = currentPresentation.slides[slideIndex]
  if (!slideToRegen) throw new Error(`Slide at index ${slideIndex} not found.`)

  const userPrompt = `Rewrite only slide ${slideIndex + 1} (${slideToRegen.slideType}: ${slideToRegen.title}) for this presentation about: ${currentPresentation.prompt}. Output only one <section> tag.`
  const systemPrompt = await buildSystemPrompt(pseudoConfig)

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
      wrappedOnResult,
      () => {},
      abortController.signal,
      settings
    )
  }

  if (settings.executionMode === 'gemini-api') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${settings.geminiApiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n---\n\nUser Request: ${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const resJson: any = await response.json()
    const responseText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let sectionHtml = responseText
    const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
    if (match) {
      sectionHtml = match[0]
    }

    wrappedOnResult(parseSlideHtml(sectionHtml, slideIndex))
    return
  }

  if (settings.executionMode === 'openai-api') {
    const responseText = await regenerateSlideOpenAiCompatible(
      'https://api.openai.com/v1/chat/completions',
      settings.openaiApiKey || '',
      'gpt-4o',
      systemPrompt,
      userPrompt
    )

    let sectionHtml = responseText
    const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
    if (match) {
      sectionHtml = match[0]
    }

    wrappedOnResult(parseSlideHtml(sectionHtml, slideIndex))
    return
  }

  if (settings.executionMode === 'deepseek-api') {
    const responseText = await regenerateSlideOpenAiCompatible(
      'https://api.deepseek.com/chat/completions',
      settings.deepseekApiKey || '',
      'deepseek-chat',
      systemPrompt,
      userPrompt
    )

    let sectionHtml = responseText
    const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
    if (match) {
      sectionHtml = match[0]
    }

    wrappedOnResult(parseSlideHtml(sectionHtml, slideIndex))
    return
  }

  if (settings.executionMode === 'groq-api') {
    const responseText = await regenerateSlideOpenAiCompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      settings.groqApiKey || '',
      'llama-3.3-70b-versatile',
      systemPrompt,
      userPrompt
    )

    let sectionHtml = responseText
    const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
    if (match) {
      sectionHtml = match[0]
    }

    wrappedOnResult(parseSlideHtml(sectionHtml, slideIndex))
    return
  }

  const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })

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

  wrappedOnResult(parseSlideHtml(sectionHtml, slideIndex))
}

async function generateAndInjectImage(
  slide: Slide,
  config: GenerationConfig,
  _settings: AppSettings,
  onSlide: (slide: Slide) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  if (abortSignal?.aborted) return

  const dom = new JSDOM(slide.html)
  const doc = dom.window.document
  const section = doc.querySelector('section')
  if (!section) return

  // ── 1. Determine the image generation prompt ──────────────────────────────
  // Priority: imagePrompt on slide -> data-prompt on .og-image-placeholder -> fallback
  const placeholder = section.querySelector('.og-image-placeholder')
  let generatedPrompt = ''

  const imagePrompt = (slide as any).imagePrompt
  if (imagePrompt && imagePrompt.trim()) {
    generatedPrompt = imagePrompt.trim()
  } else if (placeholder) {
    // Use the explicit prompt the LLM wrote — it's always more accurate
    const explicitPrompt = placeholder.getAttribute('data-prompt') || ''
    if (explicitPrompt.trim()) {
      generatedPrompt = explicitPrompt.trim()
    }
  }

  // Log a warning if imagePrompt is missing for a slide with data-slide-type of "image"
  if (!imagePrompt && slide.slideType === 'image') {
    console.warn(
      `[generator] Warning: imagePrompt is missing for slide index ${slide.index} with slideType "${slide.slideType}"`
    )
  }

  if (!generatedPrompt) {
    // Fall back to deriving a prompt from the slide content
    const slideTitle = slide.title || ''
    const firstBullet =
      slide.bullets && slide.bullets.length > 0
        ? slide.bullets[0]
            .replace(/<[^>]*>/g, '')
            .substring(0, 80)
            .trim()
        : ''
    if (slideTitle && firstBullet) {
      generatedPrompt = `${slideTitle} — ${firstBullet}`
    } else if (slideTitle) {
      generatedPrompt = slideTitle
    } else {
      generatedPrompt = 'Abstract modern technology background'
    }
  }

  // ── 2. Fetch the image from Pollinations ──────────────────────────────────
  const sanitizedPrompt = encodeURIComponent(generatedPrompt)
  // Request landscape images that fit slide proportions. Disable enhance to prevent slow LLM calls on Pollinations end.
  const url = `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=1024&height=576&nologo=true&enhance=false&private=true&feed=false`

  let arrayBuffer: ArrayBuffer | null = null
  let lastError: any = null
  const maxRetries = 1
  const timeoutMs = 12000 // 12s timeout per attempt

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (abortSignal?.aborted) break
    try {
      let timeoutId: any
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Image generation timed out after ${timeoutMs / 1000} seconds`)),
          timeoutMs
        )
      })

      const networkPromise = (async () => {
        try {
          const response = await fetch(url, { signal: abortSignal })
          if (!response.ok) {
            throw new Error(`Image API returned status ${response.status}`)
          }
          if (abortSignal?.aborted) return new ArrayBuffer(0)
          return await response.arrayBuffer()
        } finally {
          clearTimeout(timeoutId)
        }
      })()

      arrayBuffer = await Promise.race([networkPromise, timeoutPromise])
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        break // Success!
      }
    } catch (err: any) {
      lastError = err
      console.warn(`[generator] Image generation attempt ${attempt} failed: ${err.message}`)
      if (attempt < maxRetries && !abortSignal?.aborted) {
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  let base64data = ''

  try {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.warn(
        '[generator] Pollinations image generation failed or timed out. Attempting LoremFlickr fallback... Error:',
        lastError?.message || lastError
      )
      // 1. Analyze the main presentation prompt to determine the general domain/theme
      const promptLower = (config.prompt || '').toLowerCase()
      let domainKeyword = 'abstract'

      if (
        promptLower.includes('cloud') ||
        promptLower.includes('tech') ||
        promptLower.includes('computer') ||
        promptLower.includes('software') ||
        promptLower.includes('ai') ||
        promptLower.includes('artificial') ||
        promptLower.includes('data') ||
        promptLower.includes('network') ||
        promptLower.includes('digital') ||
        promptLower.includes('cyber') ||
        promptLower.includes('programming') ||
        promptLower.includes('code') ||
        promptLower.includes('quantum') ||
        promptLower.includes('internet') ||
        promptLower.includes('security')
      ) {
        domainKeyword = 'technology'
      } else if (
        promptLower.includes('business') ||
        promptLower.includes('startup') ||
        promptLower.includes('finance') ||
        promptLower.includes('market') ||
        promptLower.includes('sale') ||
        promptLower.includes('economy') ||
        promptLower.includes('invest') ||
        promptLower.includes('corporate') ||
        promptLower.includes('strategy')
      ) {
        domainKeyword = 'business'
      } else if (
        promptLower.includes('health') ||
        promptLower.includes('medical') ||
        promptLower.includes('bio') ||
        promptLower.includes('science') ||
        promptLower.includes('doctor') ||
        promptLower.includes('clinic') ||
        promptLower.includes('hosp') ||
        promptLower.includes('anatomy')
      ) {
        domainKeyword = 'science'
      } else if (
        promptLower.includes('art') ||
        promptLower.includes('design') ||
        promptLower.includes('paint') ||
        promptLower.includes('music') ||
        promptLower.includes('creativ') ||
        promptLower.includes('photo')
      ) {
        domainKeyword = 'art'
      }

      // 2. Get slide-specific words (excluding generic words)
      const slideWords = (slide.title || '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter(
          (w) =>
            w.length > 2 &&
            ![
              'key',
              'concept',
              'slide',
              'presentation',
              'topic',
              'about',
              'concept',
              'introduction',
              'conclusion',
              'summary',
              'what',
              'why',
              'how',
              'who',
              'when',
              'where',
              'which'
            ].includes(w)
        )

      // 3. Get main topic words from presentation prompt (excluding generic words)
      const promptWords = (config.prompt || '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter(
          (w) =>
            w.length > 2 &&
            ![
              'presentation',
              'slides',
              'deck',
              'about',
              'create',
              'make',
              'generate',
              'what',
              'why',
              'how',
              'who'
            ].includes(w)
        )

      // 4. Merge them and deduplicate
      const combined = Array.from(new Set([domainKeyword, ...promptWords, ...slideWords])).slice(
        0,
        3
      )

      const keywords = combined.map((tag) => encodeURIComponent(tag)).join(',')
      const fallbackUrl = `https://loremflickr.com/1024/576/${keywords}/any`
      try {
        const fallbackTimeoutMs = 8000
        let fallbackTimeoutId: any
        const fallbackTimeoutPromise = new Promise<never>((_, reject) => {
          fallbackTimeoutId = setTimeout(
            () =>
              reject(
                new Error(
                  `LoremFlickr fallback timed out after ${fallbackTimeoutMs / 1000} seconds`
                )
              ),
            fallbackTimeoutMs
          )
        })

        const fallbackNetworkPromise = (async () => {
          try {
            const fallbackResponse = await fetch(fallbackUrl, { signal: abortSignal })
            if (!fallbackResponse.ok) {
              throw new Error(`LoremFlickr returned status ${fallbackResponse.status}`)
            }
            if (abortSignal?.aborted) return new ArrayBuffer(0)
            return await fallbackResponse.arrayBuffer()
          } finally {
            clearTimeout(fallbackTimeoutId)
          }
        })()

        arrayBuffer = await Promise.race([fallbackNetworkPromise, fallbackTimeoutPromise])
      } catch (fallbackErr: any) {
        console.warn('[generator] Fallback LoremFlickr image fetch failed:', fallbackErr.message)
      }
    }

    if (arrayBuffer && arrayBuffer.byteLength > 0) {
      const buffer = Buffer.from(arrayBuffer)
      base64data = `data:image/jpeg;base64,${buffer.toString('base64')}`
    } else {
      console.warn(
        '[generator] Both Pollinations and LoremFlickr failed. Using high-fidelity custom SVG placeholder.'
      )
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="1024" height="576">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0d0d0d;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <circle cx="512" cy="288" r="180" fill="#e8ff57" opacity="0.03" />
        <path d="M 0 576 Q 256 384 512 576 T 1024 576" fill="#e8ff57" opacity="0.05" />
        <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#ede9e1" opacity="0.15">${slide.title || 'Slide Visual'}</text>
      </svg>`
      base64data = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    }

    if (abortSignal?.aborted) return

    // ── 3. Inject the image into the DOM ─────────────────────────────────────
    const imgHtml = `<img src="${base64data}" alt="${slide.title || 'Slide visual'}" />`

    if (placeholder) {
      // Find and preserve the caption bar inside the placeholder if it exists
      const captionBar = placeholder.querySelector('.og-caption-bar')

      // Replace the placeholder with the real image
      placeholder.innerHTML = imgHtml
      if (captionBar) {
        placeholder.appendChild(captionBar)
      }

      placeholder.removeAttribute('data-prompt')
      placeholder.setAttribute('class', 'og-image-figure')
    } else {
      // No placeholder: inject as a right-column split layout if slide is 'content' type
      section.classList.add('og-full-bleed-split')

      // Find the first block of content (ul/p) to pair with the image
      const contentBlock = section.querySelector('ul, ol, p')
      const heading = section.querySelector('h2, h1')

      if (contentBlock && heading) {
        // Create full-bleed split layout DOM structure
        const splitLayout = doc.createElement('div')
        splitLayout.setAttribute('class', 'og-split-layout og-img-on-right')

        const textCol = doc.createElement('div')
        textCol.setAttribute('class', 'og-text-column')

        const imgCol = doc.createElement('div')
        imgCol.setAttribute('class', 'og-image-column')

        const figure = doc.createElement('figure')
        figure.setAttribute('class', 'og-image-figure')
        figure.innerHTML = imgHtml
        imgCol.appendChild(figure)

        // Move the heading into the text column
        textCol.appendChild(heading.cloneNode(true))
        heading.parentNode?.removeChild(heading)

        // Move all other body content (not heading, not notes) into textCol
        const bodyNodes = Array.from(section.childNodes).filter((n) => {
          const el = n as Element
          const tag = el.tagName?.toLowerCase()
          return tag && !['h1', 'h2', 'aside'].includes(tag)
        })
        bodyNodes.forEach((n) => {
          textCol.appendChild(n.cloneNode(true))
          n.parentNode?.removeChild(n)
        })

        splitLayout.appendChild(textCol)
        splitLayout.appendChild(imgCol)

        const aside = section.querySelector('aside.notes')
        if (aside) {
          section.insertBefore(splitLayout, aside)
        } else {
          section.appendChild(splitLayout)
        }
      } else {
        // Minimal fallback: just append centered image
        const wrapDiv = doc.createElement('div')
        wrapDiv.setAttribute('style', 'margin-top: 24px; display: flex; justify-content: center;')
        wrapDiv.innerHTML = imgHtml
        const aside = section.querySelector('aside.notes')
        if (aside) {
          section.insertBefore(wrapDiv, aside)
        } else {
          section.appendChild(wrapDiv)
        }
      }
    }

    // ── 4. Update slide record ─────────────────────────────────────────────
    slide.html = section.outerHTML

    // Refresh bullets from updated DOM
    const updatedBullets: string[] = []
    section
      .querySelectorAll('p, li, h3, table, pre, div.card, div.stat-block, div.quote-block')
      .forEach((el) => {
        let isNested = false
        let parent = el.parentElement
        while (parent && parent !== section) {
          const tag = parent.tagName?.toLowerCase()
          const cls = parent.getAttribute('class') || ''
          if (
            ['p', 'li', 'h3', 'table', 'pre'].includes(tag) ||
            (tag === 'div' &&
              (cls.includes('card') || cls.includes('stat-block') || cls.includes('quote-block')))
          ) {
            if (!['ul', 'ol'].includes(tag)) {
              isNested = true
              break
            }
          }
          parent = parent.parentElement
        }
        if (!isNested) updatedBullets.push(el.outerHTML.trim())
      })
    slide.bullets = updatedBullets

    onSlide(slide)
  } catch (err) {
    console.error(`[generator] Image generation failed for slide ${slide.index}:`, err)
  }
}

// NOTE: Voiceover generation has been removed from this streaming pipeline.
// The kokoro-js offline TTS engine runs via the `generate-voiceovers` IPC
// handler in ipc.ts after the presentation is fully saved. This gives users
// immediate slide preview while audio generates in the background.

function getTrackKeyForTheme(themeId: string): string {
  switch (themeId) {
    case 'startup-gradient':
    case 'midnight-violet':
    case 'deep-ocean':
      return 'tech-house'
    case 'academic-clean':
    case 'corporate-minimal':
    case 'warm-paper':
    case 'grid-paper':
    case 'red-accent':
      return 'dreaming-big'
    default:
      return 'hazy-after-hours'
  }
}

function getMusicUrlFromKey(key: string): string {
  switch (key) {
    case 'tech-house':
      return 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'
    case 'dreaming-big':
      return 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3'
    case 'hazy-after-hours':
      return 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3'
    case 'sun-and-pam-trees':
      return 'https://assets.mixkit.co/music/preview/mixkit-sun-and-pam-trees-579.mp3'
    case 'valley-sunset':
      return 'https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3'
    case 'deep-urban':
      return 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-95.mp3'
    default:
      return 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3'
  }
}

async function queryGeminiApiForMusic(
  prompt: string,
  apiKey: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 20
      }
    }),
    signal: abortSignal
  })
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }
  const resJson: any = await response.json()
  return resJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function queryAnthropicApiForMusic(prompt: string, apiKey: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 20,
    system:
      'You are an AI Music Selector. Respond with ONLY the exact track key from the provided list, with no other text.',
    messages: [{ role: 'user', content: prompt }]
  })
  const textBlock = response.content[0]
  return textBlock.type === 'text' ? textBlock.text : ''
}

async function selectAiMusicTrack(
  userPrompt: string,
  settings: AppSettings,
  abortSignal?: AbortSignal
): Promise<string | undefined> {
  const tracksList = `
Choose the best matching soundtrack for a presentation about: "${userPrompt}" from this catalog:
1. tech-house (Tech, energetic, modern, futuristic, cyberpunk, house beats)
2. dreaming-big (Cinematic, inspiring, corporate growth, serious, motivating, orchestral)
3. hazy-after-hours (Lo-fi, chill, laidback, creative, dark, atmospheric, nocturnal)
4. sun-and-pam-trees (Fun, tropical, optimistic, happy, social, lighthearted)
5. valley-sunset (Ambient, slow, thoughtful, organic, design-focused, emotional)
6. deep-urban (Hip-hop, street, beat-driven, modern, high-fidelity)

Respond with ONLY the exact name of the selected track (choose from: tech-house, dreaming-big, hazy-after-hours, sun-and-pam-trees, valley-sunset, deep-urban). Do not output any other text or explanation. Just one word.
  `.trim()

  if (settings.executionMode === 'local-cli') {
    const clis = await scanInstalledCLIs()
    const selected = clis.find((c) => c.id === settings.selectedCliId)
    if (selected && selected.installed && selected.executablePath) {
      const choice = await runMusicQueryWithCLI(
        tracksList,
        selected.executablePath,
        selected.id,
        abortSignal,
        settings
      )
      const cleanChoice = choice.trim().toLowerCase()
      for (const k of [
        'tech-house',
        'dreaming-big',
        'hazy-after-hours',
        'sun-and-pam-trees',
        'valley-sunset',
        'deep-urban'
      ]) {
        if (cleanChoice.includes(k)) return k
      }
    }
  } else if (settings.executionMode === 'gemini-api' && settings.geminiApiKey) {
    const choice = await queryGeminiApiForMusic(tracksList, settings.geminiApiKey, abortSignal)
    const cleanChoice = choice.trim().toLowerCase()
    for (const k of [
      'tech-house',
      'dreaming-big',
      'hazy-after-hours',
      'sun-and-pam-trees',
      'valley-sunset',
      'deep-urban'
    ]) {
      if (cleanChoice.includes(k)) return k
    }
  } else if (settings.executionMode === 'openai-api' && settings.openaiApiKey) {
    const choice = await queryOpenAiCompatibleMusic(
      'https://api.openai.com/v1/chat/completions',
      settings.openaiApiKey,
      'gpt-4o-mini',
      tracksList,
      abortSignal
    )
    const cleanChoice = choice.trim().toLowerCase()
    for (const k of [
      'tech-house',
      'dreaming-big',
      'hazy-after-hours',
      'sun-and-pam-trees',
      'valley-sunset',
      'deep-urban'
    ]) {
      if (cleanChoice.includes(k)) return k
    }
  } else if (settings.executionMode === 'deepseek-api' && settings.deepseekApiKey) {
    const choice = await queryOpenAiCompatibleMusic(
      'https://api.deepseek.com/chat/completions',
      settings.deepseekApiKey,
      'deepseek-chat',
      tracksList,
      abortSignal
    )
    const cleanChoice = choice.trim().toLowerCase()
    for (const k of [
      'tech-house',
      'dreaming-big',
      'hazy-after-hours',
      'sun-and-pam-trees',
      'valley-sunset',
      'deep-urban'
    ]) {
      if (cleanChoice.includes(k)) return k
    }
  } else if (settings.executionMode === 'groq-api' && settings.groqApiKey) {
    const choice = await queryOpenAiCompatibleMusic(
      'https://api.groq.com/openai/v1/chat/completions',
      settings.groqApiKey,
      'llama-3.3-70b-versatile',
      tracksList,
      abortSignal
    )
    const cleanChoice = choice.trim().toLowerCase()
    for (const k of [
      'tech-house',
      'dreaming-big',
      'hazy-after-hours',
      'sun-and-pam-trees',
      'valley-sunset',
      'deep-urban'
    ]) {
      if (cleanChoice.includes(k)) return k
    }
  } else if (settings.executionMode === 'anthropic-api' && settings.claudeApiKey) {
    const choice = await queryAnthropicApiForMusic(tracksList, settings.claudeApiKey)
    const cleanChoice = choice.trim().toLowerCase()
    for (const k of [
      'tech-house',
      'dreaming-big',
      'hazy-after-hours',
      'sun-and-pam-trees',
      'valley-sunset',
      'deep-urban'
    ]) {
      if (cleanChoice.includes(k)) return k
    }
  }
  return undefined
}

async function fetchMusicBase64(
  themeId: string,
  prompt: string,
  settings?: AppSettings,
  abortSignal?: AbortSignal
): Promise<string | undefined> {
  let trackKey = 'hazy-after-hours'

  if (settings && prompt) {
    try {
      console.log('[music-generator] Querying AI to choose perfect theme soundtrack...')
      const choice = await selectAiMusicTrack(prompt, settings, abortSignal)
      if (choice) {
        trackKey = choice
        console.log(`[music-generator] AI selected soundtrack: "${trackKey}"`)
      } else {
        trackKey = getTrackKeyForTheme(themeId)
        console.log(
          `[music-generator] AI selection yielded no valid match, falling back to theme default: "${trackKey}"`
        )
      }
    } catch (err) {
      console.warn(
        '[music-generator] AI music selection failed, falling back to theme default:',
        err
      )
      trackKey = getTrackKeyForTheme(themeId)
    }
  } else {
    trackKey = getTrackKeyForTheme(themeId)
  }

  const url = getMusicUrlFromKey(trackKey)
  console.log(`[music-generator] Fetching dynamic soundtrack from: ${url}`)
  try {
    const res = await fetch(url, { signal: abortSignal })
    if (!res.ok) throw new Error(`Mixkit CDN returned status ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return `data:audio/mp3;base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[generator] Failed to fetch theme music:', err)
    return undefined
  }
}
