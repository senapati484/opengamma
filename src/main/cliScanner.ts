import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
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
 * Returns a list of directories to search for CLI executables.
 * This is necessary because packaged Electron apps on macOS/Linux run with a
 * stripped PATH that does not include Homebrew, npm global, or nvm paths.
 */
function getSearchPaths(): string[] {
  const home = os.homedir()
  const platform = os.platform()

  const paths: string[] = [
    // Standard system paths
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]

  if (platform === 'darwin' || platform === 'linux') {
    paths.push(
      // Homebrew (Apple Silicon)
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      // Homebrew (Intel Mac)
      '/usr/local/homebrew/bin',
      // npm/yarn/pnpm global bins
      path.join(home, '.npm-global', 'bin'),
      path.join(home, '.yarn', 'bin'),
      path.join(home, '.pnpm', 'bin'),
      path.join(home, 'node_modules', '.bin'),
      // nvm
      path.join(home, '.nvm', 'versions', 'node'),
      // Volta
      path.join(home, '.volta', 'bin'),
      // OpenCode
      path.join(home, '.opencode', 'bin'),
      // fnm
      path.join(home, '.fnm'),
      // Cargo (Rust)
      path.join(home, '.cargo', 'bin'),
      // Local bin
      path.join(home, '.local', 'bin'),
      path.join(home, 'bin'),
      // MacPorts
      '/opt/local/bin',
    )
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    paths.push(
      path.join(appData, 'npm'),
      path.join(localAppData, 'Programs', 'nodejs'),
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
    )
  }

  // Also include whatever PATH Electron itself has
  const envPath = process.env.PATH || ''
  const envPaths = envPath.split(path.delimiter).filter(Boolean)
  for (const p of envPaths) {
    if (!paths.includes(p)) paths.push(p)
  }

  return paths
}

/**
 * Probe a list of directories for a command executable.
 * Falls back to `which`/`where` first, then probes known locations.
 */
async function resolveCommandPath(command: string): Promise<string | null> {
  const isWin = os.platform() === 'win32'
  const suffixes = isWin ? ['.cmd', '.bat', '.exe', ''] : ['']

  // 1. Try which/where first (works in dev mode and when PATH is set)
  const whichCmd = isWin ? `where ${command}` : `which ${command}`
  try {
    const { stdout } = await execAsync(whichCmd, { timeout: 3000 })
    const lines = stdout
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length > 0) {
      if (isWin) {
        const prioritized = lines.find((line) => /\.(cmd|bat|exe)$/i.test(line))
        return prioritized || lines[0]
      }
      return lines[0]
    }
  } catch {
    // which/where failed — fall through to directory probe
  }

  // 2. Probe known directories directly (critical for packaged apps on macOS)
  const searchPaths = getSearchPaths()
  for (const dir of searchPaths) {
    for (const suffix of suffixes) {
      const candidate = path.join(dir, command + suffix)
      try {
        await fs.promises.access(candidate, fs.constants.X_OK)
        return candidate
      } catch {
        // Not found or not executable
      }
    }
  }

  // 3. On macOS/Linux, also try spawning a login shell to resolve the path
  // (handles cases like nvm-managed node/npm setups)
  if (os.platform() !== 'win32') {
    try {
      const { stdout } = await execAsync(`/bin/bash -l -c 'which ${command}'`, { timeout: 5000 })
      const found = stdout.trim().split('\n')[0]?.trim()
      if (found && found.startsWith('/')) return found
    } catch {
      try {
        const { stdout } = await execAsync(`/bin/zsh -l -c 'which ${command}'`, { timeout: 5000 })
        const found = stdout.trim().split('\n')[0]?.trim()
        if (found && found.startsWith('/')) return found
      } catch {
        // Give up
      }
    }
  }

  return null
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
