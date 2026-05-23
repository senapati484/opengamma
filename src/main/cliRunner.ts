import { spawn } from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { buildSystemPrompt } from './contextLoader'
import { extractCompleteSlides, parseSlideHtml } from './slideParser'
import type { Slide, StreamStatus, GenerationConfig } from '../renderer/src/types'

/**
 * Builds the CLI args array for a given CLI agent.
 * Returns { args, useStdin } where useStdin means the full prompt should be
 * piped to the process via stdin instead of being passed as an argument.
 */
function buildCliArgs(
  cliId: string,
  systemPrompt: string,
  userPrompt: string,
  tempFile: string
): { args: string[]; useStdin: boolean } {
  const fullPrompt = `${systemPrompt}\n\n---\n\nUser Request: ${userPrompt}`

  switch (cliId) {
    case 'gemini-cli':
      // gemini -p "<prompt>" --approval-mode plan -o text --skip-trust
      //
      // --approval-mode plan  = read-only mode, no file writes or tool execution
      // -o text               = clean plain-text stdout (no JSON/ANSI wrapper)
      // --skip-trust          = trust the (empty) temp workspace without prompting the user
      //
      // We spawn from an empty temp directory with GEMINI_CLI_TRUST_WORKSPACE=true,
      // so Gemini has nothing to scan and responds purely to the prompt.
      // The -p flag is what triggers non-interactive/headless mode.
      // We pipe the long prompt via stdin to avoid macOS/CLI argument limit/parsing issues.
      return {
        args: [
          '-p',
          'Generate slides based on the system prompt and instructions provided on stdin.',
          '--approval-mode',
          'plan',
          '-o',
          'text',
          '--skip-trust'
        ],
        useStdin: true
      }

    case 'claude-code':
      // claude --print --system-prompt-file <file> "<prompt>"
      // --print = non-interactive, print response and exit
      return {
        args: ['--print', '--system-prompt-file', tempFile, userPrompt],
        useStdin: false
      }

    case 'codex-cli':
      // codex -q "<prompt>" (quiet/non-interactive mode)
      return {
        args: ['-q', fullPrompt],
        useStdin: false
      }

    case 'opencode':
      // opencode run "<prompt>"
      return {
        args: ['run', fullPrompt],
        useStdin: false
      }

    case 'qwen-code':
      // qwen --print "<prompt>" (similar to claude-code)
      return {
        args: ['--print', fullPrompt],
        useStdin: false
      }

    default:
      // Generic fallback: pipe prompt via stdin
      return {
        args: [],
        useStdin: true
      }
  }
}

/**
 * Runs a local AI CLI tool to generate slides.
 * The CLI is invoked in non-interactive/headless mode with the system prompt
 * and user prompt combined. Output is parsed for <section> HTML tags.
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

  // Resolve real path of temporary directory to prevent symlink-based uv_cwd spawn errors on macOS
  const rawTmpDir = os.tmpdir()
  const tmpDir = fs.existsSync(rawTmpDir) ? fs.realpathSync(rawTmpDir) : rawTmpDir
  const tempFile = join(tmpDir, `og-context-${randomUUID()}.md`)

  // ── Create an empty isolated workspace for the CLI agent ─────────────────
  // CRITICAL: Gemini CLI scans the current working directory for project context.
  // Spawning from a fresh empty temp dir prevents any workspace scanning.
  const workDir = join(tmpDir, `og-gen-${randomUUID()}`)

  try {
    // Write system prompt to temp file (used by claude-code --system-prompt-file)
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')

    // Create empty workspace dir for Gemini (no files to scan)
    await fs.promises.mkdir(workDir, { recursive: true })

    const userPrompt = config.prompt
    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, userPrompt, tempFile)

    console.log(`[cliRunner] Spawning ${cliId} at path: ${cliPath} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: {
        ...process.env,
        // Suppress color codes so our parser isn't confused by ANSI sequences
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        // Tell Gemini CLI to trust this workspace automatically (needed in headless mode
        // when the cwd is not already in Gemini's trusted-folders list)
        GEMINI_CLI_TRUST_WORKSPACE: 'true'
      }
    })

    // For CLIs that read from stdin
    if (useStdin) {
      const fullPrompt = `${systemPrompt}\n\n---\n\nUser Request: ${userPrompt}`
      child.stdin.write(fullPrompt)
      child.stdin.end()
    }

    onStatus({
      state: 'generating',
      slidesGenerated: 0,
      totalSlides: config.slideCount
    })

    let buffer = ''
    let slideIndex = 0

    /**
     * Strips ANSI escape codes and markdown code fences from the buffer,
     * then returns the cleaned string ready for section-tag extraction.
     */
    function cleanBuffer(raw: string): string {
      // Remove ANSI color/cursor escape sequences
      let cleaned = raw.replace(/\x1B\[[0-9;]*[mGKHF]/g, '')
      // Remove markdown code fences (```html, ```xml, ```, ~~~, etc.)
      cleaned = cleaned.replace(/^```[a-z]*\s*\n?/gim, '')
      cleaned = cleaned.replace(/^~~~[a-z]*\s*\n?/gim, '')
      cleaned = cleaned.replace(/^```\s*$/gim, '')
      cleaned = cleaned.replace(/^~~~\s*$/gim, '')
      return cleaned
    }

    return await new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString('utf-8')
        buffer += chunk

        buffer = cleanBuffer(buffer)

        const [completeSlides, remainder] = extractCompleteSlides(buffer)
        buffer = remainder

        for (const html of completeSlides) {
          if (abortSignal.aborted) return
          const slide = parseSlideHtml(html, slideIndex++)
          onSlide(slide)
          onStatus({
            state: 'generating',
            slidesGenerated: slideIndex,
            totalSlides: config.slideCount
          })
        }
      })

      child.stderr.on('data', (data: Buffer) => {
        const line = data.toString('utf-8').trim()
        if (line) {
          if (line.includes('Ripgrep is not available')) {
            console.log(`[cliRunner] ${cliId} note: Ripgrep not found; falling back to GrepTool (non-blocking).`)
          } else {
            console.error(`[cliRunner] ${cliId} stderr:`, line)
          }
        }
      })

      child.on('close', (code: number | null) => {
        if (abortSignal.aborted) {
          resolve()
          return
        }

        // Final pass: flush any remaining buffer content that didn't end with </section>
        if (buffer.trim()) {
          const cleaned = cleanBuffer(buffer)
          const [remainingSlides, leftover] = extractCompleteSlides(cleaned)
          for (const html of remainingSlides) {
            const slide = parseSlideHtml(html, slideIndex++)
            onSlide(slide)
          }

          // If there's still a partial <section> in the leftover, try to parse it
          if (leftover.includes('<section')) {
            try {
              const slide = parseSlideHtml(leftover, slideIndex++)
              onSlide(slide)
            } catch {
              // Ignore malformed partial slides
            }
          }
        }

        if (code !== 0 && code !== null && slideIndex === 0) {
          // Only reject if we got no slides at all — partial results are acceptable
          reject(
            new Error(
              `CLI process (${cliId}) exited with code ${code} and produced no slides. ` +
                `Check that the CLI is properly authenticated and configured.`
            )
          )
        } else {
          onStatus({
            state: 'done',
            slidesGenerated: slideIndex,
            totalSlides: config.slideCount
          })
          resolve()
        }
      })

      child.on('error', (err: Error) => {
        console.error(`[cliRunner] Failed to spawn ${cliId}:`, err.message)
        reject(err)
      })

      abortSignal.addEventListener('abort', () => {
        console.log(`[cliRunner] Aborting ${cliId} process`)
        try {
          child.kill('SIGTERM')
          // Force kill after 2s if it doesn't respond
          setTimeout(() => {
            try {
              child.kill('SIGKILL')
            } catch {
              // Already dead
            }
          }, 2000)
        } catch {
          // Process may already be dead
        }
        resolve()
      })
    })
  } finally {
    // Cleanup temp files and the isolated workspace directory
    await fs.promises.unlink(tempFile).catch(() => {})
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Runs a local AI CLI tool to conduct research on a topic before generating slides.
 */
export async function runResearchWithCLI(
  config: GenerationConfig,
  cliPath: string,
  cliId: string,
  abortSignal: AbortSignal
): Promise<string> {
  const rawTmpDir = os.tmpdir()
  const tmpDir = fs.existsSync(rawTmpDir) ? fs.realpathSync(rawTmpDir) : rawTmpDir
  const tempFile = join(tmpDir, `og-context-research-${randomUUID()}.md`)
  const workDir = join(tmpDir, `og-gen-research-${randomUUID()}`)

  const systemPrompt = `You are a researcher preparing a presentation blueprint. Your task is to perform deep research and create a detailed structured outline for a ${config.slideCount}-slide presentation about: "${config.prompt}". Do NOT output any HTML code or Reveal.js tags. Provide structured concepts, target layouts, and key points in pure Markdown.`

  try {
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')
    await fs.promises.mkdir(workDir, { recursive: true })

    const userPrompt = `Please research the topic: "${config.prompt}" and provide a slide-by-slide concepts plan for a ${config.slideCount}-slide presentation.`
    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, userPrompt, tempFile)

    console.log(`[cliRunner] Spawning CLI for research: ${cliId} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: {
        ...process.env,
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        GEMINI_CLI_TRUST_WORKSPACE: 'true'
      }
    })

    if (useStdin) {
      const fullPrompt = `${systemPrompt}\n\n---\n\nUser Request: ${userPrompt}`
      child.stdin.write(fullPrompt)
      child.stdin.end()
    }

    return await new Promise<string>((resolve, reject) => {
      let output = ''

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString('utf-8')
      })

      child.stderr.on('data', (data: Buffer) => {
        const line = data.toString('utf-8').trim()
        if (line) {
          if (line.includes('Ripgrep is not available')) {
            console.log(`[cliRunner-research] ${cliId} note: Ripgrep not found; falling back to GrepTool (non-blocking).`)
          } else {
            console.error(`[cliRunner-research] ${cliId} stderr:`, line)
          }
        }
      })

      child.on('close', (_code: number | null) => {
        if (abortSignal.aborted) {
          resolve(output)
          return
        }
        resolve(output)
      })

      child.on('error', (err: Error) => {
        console.error(`[cliRunner-research] Spawn error:`, err.message)
        reject(err)
      })

      abortSignal.addEventListener('abort', () => {
        try {
          child.kill('SIGKILL')
        } catch {
          // Already dead
        }
        resolve(output)
      })
    })
  } finally {
    await fs.promises.unlink(tempFile).catch(() => {})
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
