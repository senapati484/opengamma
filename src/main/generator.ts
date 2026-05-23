import Anthropic from '@anthropic-ai/sdk'
import { JSDOM } from 'jsdom'
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

  const imagePromises: Promise<any>[] = []
  let bgMusicBase64: string | undefined = undefined

  const wrappedOnStatus = (status: StreamStatus) => {
    if (status.state === 'done') {
      ;(async () => {
        try {
          if (imagePromises.length > 0) {
            await Promise.all(imagePromises)
          }
          if (config.generateBgMusic) {
            bgMusicBase64 = await fetchMusicBase64(config.theme.id, abortSignal)
          }
        } catch (e) {
          console.error('[generator] Error waiting for assets/music:', e)
        } finally {
          onStatus({
            ...status,
            bgMusicUrl: bgMusicBase64
          })
        }
      })()
    } else {
      onStatus(status)
    }
  }

  let slideQueue: Promise<void> = Promise.resolve()

  const wrappedOnSlide = (slide: Slide) => {
    onSlide(slide)

    const assetTask = slideQueue.then(async () => {
      if (abortSignal.aborted) return

      if (config.generateImages && slide.index > 0) {
        await generateAndInjectImage(slide, config, settings, onSlide, abortSignal).catch((err) => {
          console.error('[generator] Image generation failed:', err)
        })
      }

      if (config.generateVoiceover && slide.notes) {
        try {
          const voiceoverUrl = await fetchTtsAudioBase64(slide.notes, abortSignal)
          if (voiceoverUrl && !abortSignal.aborted) {
            slide.voiceoverUrl = voiceoverUrl
            onSlide(slide)
          }
        } catch (err) {
          console.error('[generator] Voiceover generation failed:', err)
        }
      }
    })

    slideQueue = assetTask
    imagePromises.push(assetTask)
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
        abortSignal
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

    // Step 2: Slide Layout Generation
    const configWithOutline = {
      ...config,
      prompt: researchOutline
        ? `Here is a detailed research blueprint outline for the presentation:\n\n${researchOutline}\n\nUse this research outline to guide the slide generation. Ensure you generate exactly ${config.slideCount} slides with high-fidelity Reveal.js structures matching the blueprint.\n\nOriginal prompt: ${config.prompt}`
        : config.prompt
    }

    await generateWithCLI(
      configWithOutline,
      selected.executablePath,
      selected.id,
      wrappedOnSlide,
      wrappedOnStatus,
      abortSignal
    )
    return
  }

  // ── ANTHROPIC API MODE ────────────────────────────────────────────────────

  let attempt = 1
  const maxAttempts = 2
  let researchOutline = ''

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

      const anthropic = new Anthropic({ apiKey: settings.claudeApiKey })
      const systemPrompt = await buildSystemPrompt(config)

      wrappedOnStatus({
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

async function generateAndInjectImage(
  slide: Slide,
  _config: GenerationConfig,
  _settings: AppSettings,
  onSlide: (slide: Slide) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  if (abortSignal?.aborted) return

  const slideTitle = slide.title || ''
  const firstBullet = slide.bullets && slide.bullets.length > 0 ? slide.bullets[0] : ''
  const cleanBullet = firstBullet.replace(/<[^>]*>/g, '').substring(0, 80).trim()

  let generatedPrompt = ''
  if (slideTitle && cleanBullet) {
    generatedPrompt = `A professional visual representing: ${slideTitle} - ${cleanBullet}. Clean, modern corporate style illustration, minimalist vector art, premium design system aesthetics.`
  } else if (slideTitle) {
    generatedPrompt = `A professional graphic representation of: ${slideTitle}. Clean, minimalist corporate presentation design, vector illustration.`
  } else if (cleanBullet) {
    generatedPrompt = `A modern visual design depicting: ${cleanBullet}. Professional flat design style illustration.`
  } else {
    generatedPrompt = 'Abstract modern tech background, minimalist vector art, glowing neon accents, clean geometric shapes'
  }

  try {
    const sanitizedPrompt = encodeURIComponent(generatedPrompt)
    const url = `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=1024&height=768&nologo=true`

    const response = await fetch(url, { signal: abortSignal })
    if (!response.ok) throw new Error('Failed to fetch image')

    if (abortSignal?.aborted) return

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64data = `data:image/png;base64,${buffer.toString('base64')}`

    if (abortSignal?.aborted) return

    const dom = new JSDOM(slide.html)
    const doc = dom.window.document
    const section = doc.querySelector('section')

    if (section) {
      const imgTag = `<img src="${base64data}" style="max-height: 260px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 25px rgba(0,0,0,0.5); object-fit: contain;" />`

      const ul = doc.querySelector('ul')
      if (ul) {
        const li = doc.createElement('li')
        li.setAttribute(
          'style',
          'list-style-type: none !important; margin: 15px 0; padding: 0; display: flex; justify-content: center; width: 100%;'
        )
        li.innerHTML = imgTag
        ul.appendChild(li)
      } else {
        const div = doc.createElement('div')
        div.setAttribute('style', 'margin-top: 20px; display: flex; justify-content: center; width: 100%;')
        div.innerHTML = imgTag
        section.appendChild(div)
      }

      slide.html = section.outerHTML

      const updatedBullets: string[] = []
      doc.querySelectorAll('li').forEach((li) => {
        updatedBullets.push(li.innerHTML.trim())
      })
      slide.bullets = updatedBullets

      onSlide(slide)
    }
  } catch (err) {
    console.error(`[generator] Failed to generate image for slide ${slide.index}:`, err)
  }
}

function splitTextIntoChunks(text: string): string[] {
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  if (!cleanText) return []

  const sentences = cleanText.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= 180) {
      currentChunk = (currentChunk + ' ' + sentence).trim()
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      if (sentence.length > 180) {
        const clauses = sentence.split(/(?<=[,;])\s+/)
        let subChunk = ''
        for (const clause of clauses) {
          if ((subChunk + ' ' + clause).trim().length <= 180) {
            subChunk = (subChunk + ' ' + clause).trim()
          } else {
            if (subChunk) {
              chunks.push(subChunk)
            }
            if (clause.length > 180) {
              const words = clause.split(/\s+/)
              let wordChunk = ''
              for (const word of words) {
                if ((wordChunk + ' ' + word).trim().length <= 180) {
                  wordChunk = (wordChunk + ' ' + word).trim()
                } else {
                  if (wordChunk) {
                    chunks.push(wordChunk)
                  }
                  wordChunk = word
                }
              }
              if (wordChunk) {
                subChunk = wordChunk
              }
            } else {
              subChunk = clause
            }
          }
        }
        if (subChunk) {
          currentChunk = subChunk
        } else {
          currentChunk = ''
        }
      } else {
        currentChunk = sentence
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  return chunks
}

async function fetchTtsAudioBase64(text: string, abortSignal?: AbortSignal): Promise<string | undefined> {
  const chunks = splitTextIntoChunks(text)
  if (chunks.length === 0) return undefined

  try {
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      if (abortSignal?.aborted) return undefined
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunk)}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: abortSignal
      })
      if (!res.ok) {
        throw new Error(`Google TTS returned status ${res.status}`)
      }
      const arrayBuffer = await res.arrayBuffer()
      buffers.push(Buffer.from(arrayBuffer))
    }
    const combinedBuffer = Buffer.concat(buffers)
    return `data:audio/mp3;base64,${combinedBuffer.toString('base64')}`
  } catch (err) {
    console.error('[generator] TTS generation failed:', err)
    return undefined
  }
}

function getMusicUrlForTheme(themeId: string): string {
  switch (themeId) {
    case 'startup-gradient':
    case 'midnight-violet':
    case 'deep-ocean':
      return 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'
    case 'academic-clean':
    case 'corporate-minimal':
    case 'warm-paper':
    case 'grid-paper':
    case 'red-accent':
      return 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3'
    default:
      return 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3'
  }
}

async function fetchMusicBase64(themeId: string, abortSignal?: AbortSignal): Promise<string | undefined> {
  const url = getMusicUrlForTheme(themeId)
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
