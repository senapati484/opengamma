import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import type { DetectedCLI } from './types'

const execAsync = promisify(exec)

const KNOWN_AGENTS = [
  { id: 'claude-code', name: 'Claude Code', commands: ['claude'] },
  { id: 'gemini-cli', name: 'Gemini CLI', commands: ['gemini'] },
  { id: 'codex-cli', name: 'Codex CLI', commands: ['codex'] },
  { id: 'opencode', name: 'OpenCode', commands: ['opencode'] },
  { id: 'cursor-agent', name: 'Cursor Agent', commands: ['cursor'] },
  { id: 'gh-copilot', name: 'GitHub Copilot', commands: ['gh'] },
  { id: 'qwen-code', name: 'Qwen Code', commands: ['qwen'] },
  { id: 'kimi-cli', name: 'Kimi CLI', commands: ['kimi'] }
]

let cachedCLIs: DetectedCLI[] | null = null
let lastScanTime = 0
const CACHE_TTL_MS = 60 * 1000

/**
 * Executes 'which' (macOS/Linux) or 'where' (Windows) to find a command's path.
 */
async function resolveCommandPath(command: string): Promise<string | null> {
  const isWin = os.platform() === 'win32'
  const cmd = isWin ? `where ${command}` : `which ${command}`
  try {
    const { stdout } = await execAsync(cmd)
    const lines = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (isWin) {
      // Prioritize executables and batch files on Windows (which can actually run under CMD)
      const prioritized = lines.find((line) => /\.(cmd|bat|exe)$/i.test(line))
      return prioritized || lines[0] || null
    }
    return lines[0] || null
  } catch (e) {
    return null
  }
}

/**
 * Attempts to get the version string of a command.
 */
async function resolveCommandVersion(command: string): Promise<string | null> {
  try {
    // Timeout added to prevent hanging on commands that might require input if missing flags
    const { stdout, stderr } = await execAsync(`${command} --version`, { timeout: 1000 })
    const output = (stdout || stderr || '').trim()
    const lines = output.split('\n')
    return lines[0]?.trim() || null
  } catch (e) {
    try {
      const { stdout, stderr } = await execAsync(`${command} -v`, { timeout: 1000 })
      const output = (stdout || stderr || '').trim()
      const lines = output.split('\n')
      return lines[0]?.trim() || null
    } catch (err) {
      return null
    }
  }
}

/**
 * Scans the system PATH for known AI CLI agents.
 */
export async function scanInstalledCLIs(): Promise<DetectedCLI[]> {
  if (cachedCLIs && Date.now() - lastScanTime < CACHE_TTL_MS) {
    return cachedCLIs
  }

  const results = await Promise.allSettled(
    KNOWN_AGENTS.map(async (agent) => {
      for (const cmd of agent.commands) {
        const path = await resolveCommandPath(cmd)
        if (path) {
          const version = await resolveCommandVersion(cmd)
          return {
            id: agent.id,
            name: agent.name,
            installed: true,
            executablePath: path,
            version
          } as DetectedCLI
        }
      }
      return {
        id: agent.id,
        name: agent.name,
        installed: false,
        executablePath: null,
        version: null
      } as DetectedCLI
    })
  )

  const clis = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    // Fallback if unexpected error
    const agent = KNOWN_AGENTS[index]
    return {
      id: agent.id,
      name: agent.name,
      installed: false,
      executablePath: null,
      version: null
    } as DetectedCLI
  })

  // Sort: Installed first
  clis.sort((a, b) => {
    if (a.installed && !b.installed) return -1
    if (!a.installed && b.installed) return 1
    return a.name.localeCompare(b.name)
  })

  cachedCLIs = clis
  lastScanTime = Date.now()
  return clis
}

/**
 * Clears the cache and forces a fresh scan.
 */
export async function rescanCLIs(): Promise<DetectedCLI[]> {
  cachedCLIs = null
  lastScanTime = 0
  return scanInstalledCLIs()
}
