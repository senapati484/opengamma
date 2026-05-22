import { spawn } from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { buildSystemPrompt } from './contextLoader'
import { extractCompleteSlides, parseSlideHtml } from './slideParser'
import type { Slide, StreamStatus, GenerationConfig } from '../renderer/src/types'

/**
 * Runs a local AI CLI tool to generate slides.
 */
export async function generateWithCLI(
  config: GenerationConfig,
  cliPath: string,
  cliId: string,
  onSlide: (slide: Slide) => void,
  onStatus: (status: StreamStatus) => void,
  abortSignal: AbortSignal
): Promise<void> {
  const systemPrompt = await buildSystemPrompt(config)
  const tempFile = join(os.tmpdir(), `og-context-${randomUUID()}.md`)
  
  try {
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')
    
    const userPrompt = config.prompt
    let args: string[] = []

    // Build command patterns based on CLI ID
    if (cliId === 'claude-code') {
      args = ['--print', '--system-prompt-file', tempFile, userPrompt]
    } else if (cliId === 'gemini-cli') {
      // Assuming gemini-cli can take context from file or we prepend it
      args = ['-p', `${systemPrompt}\n\n${userPrompt}`]
    } else if (cliId === 'codex-cli') {
      args = [userPrompt, '--context', tempFile]
    } else {
      // Generic fallback: many tools accept prompt as positional arg
      args = [userPrompt]
    }

    const child = spawn(cliPath, args, {
      shell: false,
      env: { ...process.env, NO_COLOR: '1' }
    })

    onStatus({
      state: 'generating',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    let buffer = ''
    let slideIndex = 0

    return new Promise((resolve, reject) => {
      child.stdout.on('data', (data) => {
        const chunk = data.toString()
        buffer += chunk

        const [completeSlides, remainder] = extractCompleteSlides(buffer)
        buffer = remainder

        for (const html of completeSlides) {
          const slide = parseSlideHtml(html, slideIndex++)
          onSlide(slide)
          onStatus({
            state: 'generating',
            slidesGenerated: slideIndex,
            totalSlides: config.slideCount
          })
        }
      })

      child.stderr.on('data', (data) => {
        console.error(`[cliRunner] ${cliId} stderr:`, data.toString())
      })

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`CLI process exited with code ${code}`))
        } else {
          // Check if we have leftover buffer that didn't end with </section>
          // AI might sometimes cut off the closing tag
          if (buffer.includes('<section')) {
             const slide = parseSlideHtml(buffer, slideIndex++)
             onSlide(slide)
          }
          resolve()
        }
      })

      child.on('error', (err) => {
        reject(err)
      })

      abortSignal.addEventListener('abort', () => {
        child.kill()
        reject(new Error('Generation cancelled by user'))
      })
    })

  } finally {
    if (fs.existsSync(tempFile)) {
      await fs.promises.unlink(tempFile).catch(() => {})
    }
  }
}
