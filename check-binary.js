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
  try {
    // Read first 8 bytes for magic number + CPU type detection
    const fd = fs.openSync(binaryPath, 'r')
    const buffer = Buffer.alloc(8)
    fs.readSync(fd, buffer, 0, 8, 0)
    fs.closeSync(fd)

    const currentPlatform = process.platform
    const currentArch = process.arch // 'arm64' on Apple Silicon, 'x64' on Intel

    // ── Platform detection from magic bytes ──────────────────────────────────
    const isWindows = buffer[0] === 0x4d && buffer[1] === 0x5a // "MZ"
    const isLinux =
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46 // "\x7fELF"

    // Mach-O 64-bit little-endian: CF FA ED FE (most common on modern macOS)
    const isMacLE64 =
      buffer[0] === 0xcf &&
      buffer[1] === 0xfa &&
      buffer[2] === 0xed &&
      buffer[3] === 0xfe
    // Fat/Universal binary: CA FE BA BE
    const isFatBinary =
      buffer[0] === 0xca &&
      buffer[1] === 0xfe &&
      buffer[2] === 0xba &&
      buffer[3] === 0xbe
    const isMac = isMacLE64 || isFatBinary

    // ── CPU Architecture detection from Mach-O cputype field (bytes 4-7 LE) ──
    // ARM64:   0x0100000C → bytes [0C 00 00 01]
    // x86_64:  0x01000007 → bytes [07 00 00 01]  OR  0x00000007 → bytes [07 00 00 00]
    let binaryArch = 'unknown'
    if (isMacLE64) {
      const b4 = buffer[4], b7 = buffer[7]
      if (b4 === 0x0c && b7 === 0x01) {
        binaryArch = 'arm64'
      } else if (b4 === 0x07) {
        binaryArch = 'x64'
      }
    } else if (isFatBinary) {
      binaryArch = 'universal'
    }

    console.log(
      `[check-binary] Binary: ${isWindows ? 'Windows PE' : isLinux ? 'Linux ELF' : isMac ? `macOS Mach-O (${binaryArch})` : 'Unknown format'}`
    )
    console.log(`[check-binary] Host:   ${currentPlatform} / ${currentArch}`)

    // ── Cross-platform OS mismatch ────────────────────────────────────────────
    if (currentPlatform === 'win32' && !isWindows) {
      console.warn('[check-binary] ⚠️  Running on Windows but binary is not a Windows PE file.')
      needsRebuild = true
    } else if (currentPlatform === 'linux' && !isLinux) {
      console.warn('[check-binary] ⚠️  Running on Linux but binary is not a Linux ELF file.')
      needsRebuild = true
    } else if (currentPlatform === 'darwin' && !isMac) {
      console.warn('[check-binary] ⚠️  Running on macOS but binary is not a macOS Mach-O file.')
      needsRebuild = true
    }

    // ── CPU Architecture mismatch on macOS (THE MAIN FIX) ────────────────────
    if (currentPlatform === 'darwin' && isMac && binaryArch !== 'universal') {
      const expectedArch = currentArch === 'arm64' ? 'arm64' : 'x64'
      if (binaryArch !== 'unknown' && binaryArch !== expectedArch) {
        console.warn(
          `[check-binary] ⚠️  Architecture mismatch! Binary is ${binaryArch} but Electron needs ${expectedArch} (Apple Silicon).`
        )
        needsRebuild = true
      }
    }
  } catch (readErr) {
    console.warn('[check-binary] Error reading binary headers:', readErr.message)
    needsRebuild = true
  }

  // Also do a runtime load check for ABI mismatches
  if (!needsRebuild) {
    try {
      require('better-sqlite3')
      console.log('[check-binary] ✓ better-sqlite3 loaded successfully.')
    } catch (err) {
      console.warn(
        '[check-binary] ⚠️  better-sqlite3 failed to load (ABI mismatch):',
        err.message
      )
      needsRebuild = true
    }
  }
}

if (needsRebuild) {
  console.log('[check-binary] Clearing stale build cache...')
  try {
    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true })
      console.log('[check-binary] Build directory cleared.')
    }
  } catch (cleanErr) {
    console.warn('[check-binary] Failed to clear build folder:', cleanErr.message)
  }

  console.log('[check-binary] Rebuilding native module for Electron arm64...')
  try {
    const electronRebuildBin = path.join(__dirname, 'node_modules', '.bin', 'electron-rebuild')
    const electronPkg = require(path.join(__dirname, 'node_modules', 'electron', 'package.json'))
    const electronVersion = electronPkg.version
    execSync(`node "${electronRebuildBin}" --version "${electronVersion}" -f`, {
      stdio: 'inherit',
      cwd: __dirname
    })
    console.log('[check-binary] ✓ Native better-sqlite3 rebuilt successfully.')
  } catch (rebuildErr) {
    console.error('[check-binary] ✗ Automatic rebuild failed:', rebuildErr.message)
    console.error(
      '[check-binary] Manual fix: run the following command from project root:\n' +
      '  node node_modules/.bin/electron-rebuild --version <electron-version> -f'
    )
  }
} else {
  console.log('[check-binary] ✓ Native better-sqlite3 is compatible with the host system.')
}
