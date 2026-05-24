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
import { generateWithCLI, runResearchWithCLI, runMusicQueryWithCLI } from './cliRunner'
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
        } catch (e) {
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
            await Promise.all(imagePromises)
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

    // Only image generation runs per-slide during streaming.
    // Voiceover is generated offline via the kokoro-js IPC handler
    // (`generate-voiceovers`) after the full presentation is saved.
    const assetTask = slideQueue.then(async () => {
      if (abortSignal.aborted) return

      if (config.generateImages) {
        // Always run for explicit 'image' type slides (they have og-image-placeholder)
        // Also run for non-title content slides to enrich them
        const isImageSlide = slide.slideType === 'image'
        const isNonTitleSlide = slide.slideType !== 'title' && slide.index > 0
        if (isImageSlide || isNonTitleSlide) {
          await generateAndInjectImage(slide, config, settings, onSlide, abortSignal).catch(
            (err) => {
              console.error('[generator] Image generation failed:', err)
            }
          )
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
      abortSignal,
      settings
    )
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

      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Narrative style: "${config.narrative || 'explainer'}". Output only structured markdown ideas. No HTML, no reveal.js code.`
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

      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Narrative style: "${config.narrative || 'explainer'}". Output only structured markdown ideas. No HTML, no reveal.js code.`
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

      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Narrative style: "${config.narrative || 'explainer'}". Output only structured markdown ideas. No HTML, no reveal.js code.`
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

      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Narrative style: "${config.narrative || 'explainer'}". Output only structured markdown ideas. No HTML, no reveal.js code.`
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
      const researchSystemPrompt = `You are a professional presentation researcher and blueprint planner. Create a slide-by-slide concepts and layouts plan for a ${config.slideCount}-slide presentation about: "${config.prompt}". Narrative style: "${config.narrative || 'explainer'}". Output only structured markdown ideas. No HTML, no reveal.js code.`
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
      onResult,
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

    onResult(parseSlideHtml(sectionHtml, slideIndex))
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

    onResult(parseSlideHtml(sectionHtml, slideIndex))
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

    onResult(parseSlideHtml(sectionHtml, slideIndex))
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

    onResult(parseSlideHtml(sectionHtml, slideIndex))
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

  const dom = new JSDOM(slide.html)
  const doc = dom.window.document
  const section = doc.querySelector('section')
  if (!section) return

  // ── 1. Determine the image generation prompt ──────────────────────────────
  // Priority: data-prompt on <figure class="og-image-placeholder"> → slide title + bullets
  const placeholder = section.querySelector('figure.og-image-placeholder')
  let generatedPrompt = ''

  if (placeholder) {
    // Use the explicit prompt the LLM wrote — it's always more accurate
    const explicitPrompt = placeholder.getAttribute('data-prompt') || ''
    if (explicitPrompt.trim()) {
      generatedPrompt = explicitPrompt.trim()
    }
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
      generatedPrompt = `Professional visual for: ${slideTitle} — ${firstBullet}. Clean, modern corporate illustration, premium presentation aesthetics, wide landscape, no text.`
    } else if (slideTitle) {
      generatedPrompt = `Minimalist professional graphic for: ${slideTitle}. Premium corporate style, wide landscape, no text overlays.`
    } else {
      generatedPrompt =
        'Abstract modern technology background, geometric shapes, clean minimalist corporate style, wide landscape'
    }
  }

  // ── 2. Fetch the image from Pollinations ──────────────────────────────────
  const sanitizedPrompt = encodeURIComponent(generatedPrompt)
  // Request landscape images that fit slide proportions. Disable enhance to prevent slow LLM calls on Pollinations end.
  const url = `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=1024&height=576&nologo=true&enhance=false&private=true&feed=false`

  let arrayBuffer: ArrayBuffer | null = null
  let lastError: any = null
  const maxRetries = 3
  const timeoutMs = 25000 // 25s timeout per attempt

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

  try {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw lastError || new Error('Failed to generate image after multiple attempts')
    }
    const buffer = Buffer.from(arrayBuffer)
    const base64data = `data:image/jpeg;base64,${buffer.toString('base64')}`

    if (abortSignal?.aborted) return

    // ── 3. Inject the image into the DOM ─────────────────────────────────────
    const imgHtml = `<img src="${base64data}" alt="${slide.title || 'Slide visual'}" style="max-width: 100%; max-height: 360px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.45);" />`

    if (placeholder) {
      // Replace the placeholder <figure> with the real image
      placeholder.innerHTML = imgHtml
      placeholder.removeAttribute('data-prompt')
      placeholder.classList.remove('og-image-placeholder')
      placeholder.classList.add('og-image-figure')
    } else {
      // No placeholder: inject as a right-column split layout if slide is 'content' type
      section.classList.add('has-image')

      // Find the first block of content (ul/p) to pair with the image
      const contentBlock = section.querySelector('ul, ol, p')
      const heading = section.querySelector('h2, h1')

      if (contentBlock && heading) {
        // Wrap existing content in left col, image in right col
        const leftDiv = doc.createElement('div')
        leftDiv.setAttribute('class', 'og-img-left')
        leftDiv.setAttribute('style', 'text-align: left;')

        const rightDiv = doc.createElement('div')
        rightDiv.setAttribute('class', 'og-img-right')
        rightDiv.setAttribute(
          'style',
          'display: flex; justify-content: center; align-items: center;'
        )
        rightDiv.innerHTML = imgHtml

        // Move all body content (not heading, not notes) into leftDiv
        const bodyNodes = Array.from(section.childNodes).filter((n) => {
          const el = n as Element
          const tag = el.tagName?.toLowerCase()
          return tag && !['h1', 'h2', 'aside'].includes(tag)
        })
        bodyNodes.forEach((n) => leftDiv.appendChild(n.cloneNode(true)))
        bodyNodes.forEach((n) => n.parentNode?.removeChild(n))

        const colsDiv = doc.createElement('div')
        colsDiv.setAttribute('class', 'cols')
        colsDiv.setAttribute(
          'style',
          'display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px; margin-top: 24px; align-items: center;'
        )
        colsDiv.appendChild(leftDiv)
        colsDiv.appendChild(rightDiv)

        const aside = section.querySelector('aside.notes')
        if (aside) {
          section.insertBefore(colsDiv, aside)
        } else {
          section.appendChild(colsDiv)
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
