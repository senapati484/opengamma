/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('[check-binary] Verifying native better-sqlite3 platform compatibility...')

const sqliteDir = path.join(__dirname, 'node_modules', 'better-sqlite3')
const buildPath = path.join(sqliteDir, 'build')
const binaryPath = path.join(buildPath, 'Release', 'better_sqlite3.node')

let needsRebuild = false

if (!fs.existsSync(binaryPath)) {
  console.log('[check-binary] Native better-sqlite3 binary not found. Needs rebuild.')
  needsRebuild = true
} else {
  // Read the first 4 magic bytes of the compiled native module to check platform headers
  try {
    const fd = fs.openSync(binaryPath, 'r')
    const buffer = Buffer.alloc(4)
    fs.readSync(fd, buffer, 0, 4, 0)
    fs.closeSync(fd)

    const isWindows = buffer[0] === 0x4d && buffer[1] === 0x5a // "MZ"
    const isLinux =
      buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46 // "\x7fELF"

    // macOS Mach-O magic bytes can be feedface (32-bit), feedfacf (64-bit), or cafebabe (Fat/Universal binary)
    const isMac =
      (buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa) ||
      (buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
      (buffer[0] === 0xca && buffer[1] === 0xbe && buffer[2] === 0xba && buffer[3] === 0xbe)

    const currentPlatform = process.platform
    console.log(
      `[check-binary] Detected binary headers: ${isWindows ? 'Windows PE' : isLinux ? 'Linux ELF' : isMac ? 'macOS Mach-O' : 'Unknown'}`
    )

    if (currentPlatform === 'win32' && !isWindows) {
      console.warn('[check-binary] Running on Windows but binary is not a Windows PE file.')
      needsRebuild = true
    } else if (currentPlatform === 'linux' && !isLinux) {
      console.warn('[check-binary] Running on Linux but binary is not a Linux ELF file.')
      needsRebuild = true
    } else if (currentPlatform === 'darwin' && !isMac) {
      console.warn('[check-binary] Running on macOS but binary is not a macOS Mach-O file.')
      needsRebuild = true
    }
  } catch (readErr) {
    console.warn('[check-binary] Error reading binary magic bytes:', readErr.message)
    needsRebuild = true
  }

  // Also verify standard Node loading to catch ABI or dynamic loading mismatch
  if (!needsRebuild) {
    try {
      require('better-sqlite3')
      console.log('[check-binary] better-sqlite3 binary loaded successfully in Node.js.')
    } catch (err) {
      console.warn(
        '[check-binary] better-sqlite3 binary failed to load in Node.js (likely ABI mismatch):',
        err.message
      )
      needsRebuild = true
    }
  }
}

if (needsRebuild) {
  console.log(
    '[check-binary] Force-cleaning native build caches to prevent build tool shortcuts...'
  )
  try {
    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true })
      console.log('[check-binary] better-sqlite3/build directory cleared successfully.')
    }
  } catch (cleanErr) {
    console.warn(
      '[check-binary] Failed to clear build folder (continuing anyway):',
      cleanErr.message
    )
  }

  console.log('[check-binary] Rebuilding native dependencies for the host Electron environment...')
  try {
    execSync('npm run postinstall', { stdio: 'inherit' })
    console.log('[check-binary] Native better-sqlite3 rebuilt successfully for host platform.')
  } catch (rebuildErr) {
    console.error('[check-binary] Automatic native rebuild failed:', rebuildErr.message)
  }
} else {
  console.log('[check-binary] Native better-sqlite3 is compatible with the host system.')
}
