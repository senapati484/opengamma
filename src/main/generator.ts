import Anthropic from '@anthropic-ai/sdk'
import type { GenerationConfig, Slide, StreamStatus, Presentation } from '../renderer/src/types'
import { buildSystemPrompt } from './contextLoader'
import { parseSlideHtml } from './slideParser'
import { themes } from '../renderer/src/lib/themes'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'

let _store: any = null
async function getSettings(): Promise<any> {
  if (!_store) {
    const { default: Store } = await import('electron-store')
    _store = new Store({
      name: 'opengamma-settings',
      encryptionKey: 'og-settings-enc-key'
    })
  }
  return {
    cliTool: _store.get('cliTool', '') as string,
    cliPath: _store.get('cliPath', '') as string,
    modelName: _store.get('modelName', '') as string,
    cliTemperature: _store.get('cliTemperature', 0.7) as number,
    cliMaxTokens: _store.get('cliMaxTokens', 2048) as number,
    cliOutputMode: _store.get('cliOutputMode', 'stream') as 'stream' | 'buffered',
    cliCustomArgs: _store.get('cliCustomArgs', '') as string,
    cliWorkingDir: _store.get('cliWorkingDir', '') as string,
    cliEnvVars: _store.get('cliEnvVars', '') as string
  }
}

async function runCliTool(
  promptText: string,
  settings: any,
  abortSignal: AbortSignal,
  onChunk: (text: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (abortSignal.aborted) {
      return reject(new Error('AbortError'))
    }

    const appDataPath = app.getPath('userData')
    const defaultCwd = path.join(appDataPath, 'cli_temp')
    if (!fs.existsSync(defaultCwd)) {
      fs.mkdirSync(defaultCwd, { recursive: true })
    }

    const cwd = settings.cliWorkingDir ? path.resolve(settings.cliWorkingDir) : defaultCwd
    const env = { ...process.env }
    if (settings.cliEnvVars) {
      settings.cliEnvVars.split('\n').forEach((line: string) => {
        const idx = line.indexOf('=')
        if (idx !== -1) {
          const key = line.substring(0, idx).trim()
          const val = line.substring(idx + 1).trim()
          if (key) {
            env[key] = val
          }
        }
      })
    }

    let args: string[] = []
    let hasPromptPlaceholder = false
    if (settings.cliCustomArgs) {
      const matches = settings.cliCustomArgs.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
      if (matches) {
        args = matches.map((arg: string) => {
          let res = arg
          if (
            (res.startsWith('"') && res.endsWith('"')) ||
            (res.startsWith("'") && res.endsWith("'"))
          ) {
            res = res.slice(1, -1)
          }
          if (settings.modelName) res = res.replace('$MODEL', settings.modelName)
          res = res.replace('$TEMPERATURE', String(settings.cliTemperature ?? 0.7))
          res = res.replace('$MAX_TOKENS', String(settings.cliMaxTokens ?? 2048))
          if (res.includes('$PROMPT')) {
            hasPromptPlaceholder = true
            res = res.replace('$PROMPT', promptText)
          }
          return res
        })
      }
    }

    const cliPath = settings.cliPath
    if (!cliPath) {
      return reject(new Error('No CLI path configured.'))
    }

    const subprocess = spawn(cliPath, args, { cwd, env })

    let stdoutBuffer = ''
    let stderrBuffer = ''

    const onAbort = () => {
      try {
        subprocess.kill()
      } catch (err) {
        // Ignore kill
      }
    }

    abortSignal.addEventListener('abort', onAbort)

    if (!hasPromptPlaceholder) {
      try {
        subprocess.stdin.write(promptText)
        subprocess.stdin.end()
      } catch (err) {
        console.error('Failed to write to stdin of subprocess:', err)
      }
    }

    subprocess.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdoutBuffer += text
      onChunk(text)
    })

    subprocess.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString()
    })

    subprocess.on('close', (code) => {
      abortSignal.removeEventListener('abort', onAbort)
      if (code !== 0) {
        reject(
          new Error(
            `CLI process exited with code ${code}. Error: ${stderrBuffer.trim() || 'Unknown error'}`
          )
        )
      } else {
        resolve(stdoutBuffer)
      }
    })

    subprocess.on('error', (err) => {
      abortSignal.removeEventListener('abort', onAbort)
      reject(err)
    })
  })
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

  const settings = await getSettings()
  const isCliMode = settings.cliTool && settings.cliTool !== 'claude'

  if (isCliMode) {
    const systemPrompt = await buildSystemPrompt(config)
    const promptText = `System Prompt:
${systemPrompt}

User Prompt:
${config.prompt}`

    onStatus({
      state: 'generating',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    let buffer = ''
    let count = 0

    const onChunk = (chunkText: string) => {
      if (settings.cliOutputMode === 'stream') {
        buffer += chunkText
        const { slides, remainder } = extractCompleteSlides(buffer)
        buffer = remainder

        for (const slideHtml of slides) {
          if (abortSignal.aborted) return
          const parsedSlide = parseSlideHtml(slideHtml, count)
          onSlide(parsedSlide)
          onStatus({
            state: 'generating',
            slidesGenerated: ++count,
            totalSlides: config.slideCount
          })
        }
      }
    }

    try {
      const fullOutput = await runCliTool(promptText, settings, abortSignal, onChunk)

      // If buffered, or if we have any remaining content in the buffer
      if (settings.cliOutputMode === 'buffered') {
        buffer = fullOutput
      }

      const { slides: finalSlides } = extractCompleteSlides(buffer)
      for (const slideHtml of finalSlides) {
        if (abortSignal.aborted) return
        const parsedSlide = parseSlideHtml(slideHtml, count)
        onSlide(parsedSlide)
        onStatus({
          state: 'generating',
          slidesGenerated: ++count,
          totalSlides: config.slideCount
        })
      }

      onStatus({
        state: 'done',
        slidesGenerated: count,
        totalSlides: config.slideCount
      })
    } catch (err: any) {
      if (abortSignal.aborted || err.message === 'AbortError') {
        onStatus({
          state: 'idle',
          slidesGenerated: 0,
          totalSlides: config.slideCount
        })
      } else {
        onStatus({
          state: 'error',
          slidesGenerated: 0,
          totalSlides: config.slideCount,
          errorMessage: err.message || 'CLI execution failed'
        })
        throw err
      }
    }
    return
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

            const parsedSlide = parseSlideHtml(slideHtml, count)

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

        const parsedSlide = parseSlideHtml(slideHtml, count)

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

/**
 * Single Slide Regeneration
 * Rewrites only one slide in isolation based on the original user prompt.
 */
export async function regenerateSlide(
  slideIndex: number,
  currentPresentation: Presentation,
  apiKey: string,
  onResult: (slide: Slide) => void
): Promise<void> {
  const settings = await getSettings()
  const isCliMode = settings.cliTool && settings.cliTool !== 'claude'

  if (isCliMode) {
    const themeId = currentPresentation.theme
    const matchedTheme = themes.find((t) => t.id === themeId) || themes[0]

    const pseudoConfig: GenerationConfig = {
      prompt: currentPresentation.prompt,
      theme: matchedTheme,
      slideCount: currentPresentation.slides.length
    }

    const systemPrompt = await buildSystemPrompt(pseudoConfig)
    const slideToRegen = currentPresentation.slides[slideIndex]
    if (!slideToRegen) {
      throw new Error(`Slide at index ${slideIndex} not found in the presentation.`)
    }

    const userPrompt = `Rewrite only slide ${slideIndex + 1} (${slideToRegen.slideType}: ${slideToRegen.title}) for this presentation about: ${currentPresentation.prompt}. Output only one <section> tag.`
    const promptText = `System Prompt:
${systemPrompt}

User Prompt:
${userPrompt}`

    // Use dummy AbortSignal that doesn't abort
    const controller = new AbortController()
    const fullOutput = await runCliTool(promptText, settings, controller.signal, () => {})

    let sectionHtml = fullOutput
    const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(fullOutput)
    if (match) {
      sectionHtml = match[0]
    }

    const parsedSlide = parseSlideHtml(sectionHtml, slideIndex)
    onResult(parsedSlide)
    return
  }

  const anthropic = new Anthropic({ apiKey })

  const themeId = currentPresentation.theme
  const matchedTheme = themes.find((t) => t.id === themeId) || themes[0]

  const pseudoConfig: GenerationConfig = {
    prompt: currentPresentation.prompt,
    theme: matchedTheme,
    slideCount: currentPresentation.slides.length
  }

  const systemPrompt = await buildSystemPrompt(pseudoConfig)

  const slideToRegen = currentPresentation.slides[slideIndex]
  if (!slideToRegen) {
    throw new Error(`Slide at index ${slideIndex} not found in the presentation.`)
  }

  const userPrompt = `Rewrite only slide ${slideIndex + 1} (${slideToRegen.slideType}: ${slideToRegen.title}) for this presentation about: ${currentPresentation.prompt}. Output only one <section> tag.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })

  let responseText = ''
  if (response.content && response.content[0] && response.content[0].type === 'text') {
    responseText = response.content[0].text
  }

  // Extract only the section element case-insensitively to robustly handle conversational wrapper text/markdown
  let sectionHtml = responseText
  const match = /<section[^>]*>[\s\S]*?<\/section>/i.exec(responseText)
  if (match) {
    sectionHtml = match[0]
  }

  const parsedSlide = parseSlideHtml(sectionHtml, slideIndex)
  onResult(parsedSlide)
}
