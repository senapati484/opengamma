import { spawn } from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { buildSystemPrompt } from './contextLoader'
import { extractCompleteSlides, parseSlideHtml } from './slideParser'
import type { Slide, StreamStatus, GenerationConfig, AppSettings, SlideBlueprint } from '../renderer/src/types'

/**
 * Helper to build the environment variables for child CLI processes.
 * Forwards all API keys and prevents the "Both GOOGLE_API_KEY and GEMINI_API_KEY are set" warning.
 */
function buildChildEnv(settings?: AppSettings): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
  env.NO_COLOR = '1'
  env.FORCE_COLOR = '0'
  env.GEMINI_CLI_TRUST_WORKSPACE = 'true'

  if (settings?.geminiApiKey) {
    env.GEMINI_API_KEY = settings.geminiApiKey
    env.GOOGLE_API_KEY = settings.geminiApiKey
  }
  if (settings?.claudeApiKey) {
    env.ANTHROPIC_API_KEY = settings.claudeApiKey
    env.CLAUDE_API_KEY = settings.claudeApiKey
  }
  if (settings?.openaiApiKey) {
    env.OPENAI_API_KEY = settings.openaiApiKey
  }
  if (settings?.deepseekApiKey) {
    env.DEEPSEEK_API_KEY = settings.deepseekApiKey
  }
  if (settings?.groqApiKey) {
    env.GROQ_API_KEY = settings.groqApiKey
  }

  // To prevent the "Both GOOGLE_API_KEY and GEMINI_API_KEY are set" warning from gemini-cli,
  // we delete GOOGLE_API_KEY if GEMINI_API_KEY is also present.
  if (env.GEMINI_API_KEY && env.GOOGLE_API_KEY) {
    delete env.GOOGLE_API_KEY
  }

  return env
}

/**
 * Builds the CLI args array for a given CLI agent.
 * Returns { args, useStdin } where useStdin means the full prompt should be
 * piped to the process via stdin instead of being passed as an argument.
 */
function buildCliArgs(
  cliId: string,
  systemPrompt: string,
  userPrompt: string,
  tempFile: string,
  purpose: 'slides' | 'research' | 'music' = 'slides'
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
      let geminiPrompt = ''
      if (purpose === 'research') {
        geminiPrompt = 'Research the topic and output a structured outline/blueprint plan in Markdown.'
      } else if (purpose === 'music') {
        geminiPrompt = 'Analyze the presentation topic and select the best soundtrack name from the list.'
      } else if (systemPrompt.includes('SINGLE SLIDE GENERATION MODE')) {
        geminiPrompt = 'Generate exactly one raw Reveal.js slide section based on the single slide instruction on stdin.'
      } else {
        geminiPrompt = 'Generate raw Reveal.js slide sections based on the system prompt and instructions provided on stdin.'
      }

      return {
        args: [
          '-p',
          geminiPrompt,
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

    case 'kimi-cli':
      // kimi --print --quiet "<prompt>"
      return {
        args: ['--print', '--quiet', fullPrompt],
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
  abortSignal: AbortSignal,
  settings?: AppSettings
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

    const userPrompt = config.blueprint
      ? `Generate EXACTLY ONE raw <section> element for Slide ${config.blueprint.index + 1}: "${config.blueprint.title}"`
      : config.prompt
    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, userPrompt, tempFile, 'slides')

    console.log(`[cliRunner] Spawning ${cliId} at path: ${cliPath} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: buildChildEnv(settings)
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
          if (
            line.includes('Ripgrep is not available') ||
            line.includes('ripgrep not found') ||
            line.includes('falling back to GrepTool')
          ) {
            // Silently ignore ripgrep fallback warning to keep logs clean and avoid user confusion
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
  abortSignal: AbortSignal,
  settings?: AppSettings
): Promise<string> {
  const rawTmpDir = os.tmpdir()
  const tmpDir = fs.existsSync(rawTmpDir) ? fs.realpathSync(rawTmpDir) : rawTmpDir
  const tempFile = join(tmpDir, `og-context-research-${randomUUID()}.md`)
  const workDir = join(tmpDir, `og-gen-research-${randomUUID()}`)

  const slideCount = config.slideCount || 8
  const targetImageCount = Math.max(1, Math.round(slideCount * 0.3))

  const systemPrompt = `You are a professional presentation researcher and blueprint planner.
Your task is to create a detailed slide-by-slide table of contents structure and layout plan for a ${slideCount}-slide presentation about: "${config.prompt}".
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
   - Keep the Concept: field extremely short (exactly 1 short sentence or 3-5 keywords) as we will spin detailed individual deep research agents for each slide later. Focus on structuring a solid high-level narrative.
   - For each slide, you MUST follow this exact template:

Slide [Number]
Title: [Slide Title]
Type: [title | content | split | data | cta | image | stat | quote]
Concept: [Extremely brief 1-sentence keyword summary of the core slide topic (keep it short, as detailed research will be run later)]
Image: [Only if layout Type is 'image', provide a descriptive, topic-relevant AI image prompt; otherwise, omit this field entirely]

Begin slide plan now:`

  try {
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')
    await fs.promises.mkdir(workDir, { recursive: true })

    const userPrompt = `Please research the topic: "${config.prompt}" and provide a slide-by-slide concepts plan for a ${config.slideCount}-slide presentation.`
    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, userPrompt, tempFile, 'research')

    console.log(`[cliRunner] Spawning CLI for research: ${cliId} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: buildChildEnv(settings)
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
          if (
            line.includes('Ripgrep is not available') ||
            line.includes('ripgrep not found') ||
            line.includes('falling back to GrepTool')
          ) {
            // Silently ignore ripgrep fallback warning to keep logs clean and avoid user confusion
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

/**
 * Runs a local AI CLI tool to perform deep technical research for a chunk of slides in parallel.
 */
export async function runChunkResearchWithCLI(
  config: GenerationConfig,
  chunk: SlideBlueprint[],
  chunkIndex: number,
  cliPath: string,
  cliId: string,
  abortSignal: AbortSignal,
  settings?: AppSettings
): Promise<string> {
  const rawTmpDir = os.tmpdir()
  const tmpDir = fs.existsSync(rawTmpDir) ? fs.realpathSync(rawTmpDir) : rawTmpDir
  const tempFile = join(tmpDir, `og-context-chunk-research-${randomUUID()}.md`)
  const workDir = join(tmpDir, `og-gen-chunk-research-${randomUUID()}`)

  const systemPrompt = `You are a professional presentation researcher.
Your task is to perform targeted, deep research and gather comprehensive, highly accurate details for a specific chunk of slides in a presentation.

Presentation Details:
- Topic: "${config.prompt}"
- Total Slides: ${config.slideCount}
- This Chunk Index: ${chunkIndex + 1}
- Slides in this Chunk:
${chunk.map(s => `  * Slide ${s.index + 1}: "${s.title}" (Layout Archetype: "${s.slideType}")`).join('\n')}

INSTRUCTIONS:
1. For EACH slide listed above, perform deep technical research. Provide extensive technical details, mechanics, concrete real-world examples (like AWS, Heroku, Salesforce), boundaries, and exact metrics.
2. Keep the output extremely structured, clear, and rich in copy.
3. For each slide, write detailed points (up to 15-20 words per point) and explanatory paragraphs (2-3 sentences).
4. Output ONLY structured markdown. Do NOT write HTML code, CSS, or Reveal.js tags.

OUTPUT FORMAT (You MUST follow this exact format for each slide in the chunk):

Slide [Number]
Concept: [Highly detailed descriptive paragraphs and concrete facts/examples for this slide. Write at least 40-60 words of comprehensive, perfect technical copy.]

Begin chunk research now:`

  try {
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')
    await fs.promises.mkdir(workDir, { recursive: true })

    const userPrompt = `Please perform deep technical research specifically for the following slides: ${chunk.map(s => `Slide ${s.index + 1}: "${s.title}"`).join(', ')}. Include concrete facts and real-world examples.`
    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, userPrompt, tempFile, 'research')

    console.log(`[cliRunner-chunk-research] Spawning CLI for chunk ${chunkIndex + 1} (Slides ${chunk[0].index + 1}-${chunk[chunk.length - 1].index + 1}): ${cliId} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: buildChildEnv(settings)
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

      child.stderr.on('data', () => {
        // Suppress benign logs
      })

      child.on('close', () => {
        resolve(output.trim())
      })

      child.on('error', (err: Error) => {
        console.error(`[cliRunner-chunk-research] Spawn error:`, err.message)
        reject(err)
      })

      abortSignal.addEventListener('abort', () => {
        try {
          child.kill('SIGKILL')
        } catch {}
        resolve(output.trim())
      })
    })
  } finally {
    await fs.promises.unlink(tempFile).catch(() => {})
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Runs a local AI CLI tool to query the soundtrack recommendation.
 */
export async function runMusicQueryWithCLI(
  prompt: string,
  cliPath: string,
  cliId: string,
  abortSignal?: AbortSignal,
  settings?: AppSettings
): Promise<string> {
  const rawTmpDir = os.tmpdir()
  const tmpDir = fs.existsSync(rawTmpDir) ? fs.realpathSync(rawTmpDir) : rawTmpDir
  const tempFile = join(tmpDir, `og-context-music-${randomUUID()}.md`)
  const workDir = join(tmpDir, `og-gen-music-${randomUUID()}`)

  const systemPrompt = `You are an AI Music Selector. Your job is to select the perfect background music track for a presentation. Respond with ONLY the exact track key from the provided list, with no other text, commentary, formatting, or prose.`

  try {
    await fs.promises.writeFile(tempFile, systemPrompt, 'utf-8')
    await fs.promises.mkdir(workDir, { recursive: true })

    const { args, useStdin } = buildCliArgs(cliId, systemPrompt, prompt, tempFile, 'music')

    console.log(`[cliRunner-music] Spawning CLI for music query: ${cliId} cwd: ${workDir}`)

    const child = spawn(cliPath, args, {
      shell: process.platform === 'win32',
      cwd: workDir,
      env: buildChildEnv(settings)
    })

    if (useStdin) {
      const fullPrompt = `${systemPrompt}\n\n---\n\nUser Request: ${prompt}`
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
          if (
            line.includes('Ripgrep is not available') ||
            line.includes('ripgrep not found') ||
            line.includes('falling back to GrepTool')
          ) {
            // Silently ignore
          } else {
            console.error(`[cliRunner-music] ${cliId} stderr:`, line)
          }
        }
      })

      child.on('close', (_code: number | null) => {
        if (abortSignal?.aborted) {
          resolve(output)
          return
        }
        resolve(output)
      })

      child.on('error', (err: Error) => {
        console.error(`[cliRunner-music] Spawn error:`, err.message)
        reject(err)
      })

      abortSignal?.addEventListener('abort', () => {
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
