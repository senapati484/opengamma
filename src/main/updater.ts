import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'

/**
 * Resolves the currently active main window safely.
 */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] ?? null
}

/**
 * Compares two semantic version strings (e.g. "1.0.1" and "1.0.0").
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if they are equal.
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number)
  const parts2 = v2.replace(/^v/, '').split('.').map(Number)
  const maxLength = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * Helper to fetch a remote JSON file securely.
 */
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = (targetUrl: string) => {
      const protocol = targetUrl.startsWith('https') ? https : http
      protocol.get(targetUrl, (res) => {
        // Handle HTTP redirect (301 or 302)
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location
          if (redirectUrl) {
            request(redirectUrl)
            return
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch release info: Status ${res.statusCode}`))
          return
        }

        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error('Failed to parse release response'))
          }
        })
      }).on('error', reject)
    }

    request(url)
  })
}

/**
 * Helper to download a remote file with redirect support and progress reporting.
 */
function downloadFile(
  url: string,
  dest: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    const request = (targetUrl: string) => {
      const protocol = targetUrl.startsWith('https') ? https : http
      protocol.get(targetUrl, (res) => {
        // Handle standard redirects (301 or 302)
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location
          if (redirectUrl) {
            request(redirectUrl)
            return
          }
        }

        if (res.statusCode !== 200) {
          file.close()
          fs.unlink(dest, () => {})
          reject(new Error(`Failed to download asset: Status ${res.statusCode}`))
          return
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedBytes = 0

        res.pipe(file)

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length
          if (totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100)
            onProgress(percent)
          }
        })

        file.on('finish', () => {
          file.close()
          resolve()
        })

        file.on('error', (err) => {
          file.close()
          fs.unlink(dest, () => {})
          reject(err)
        })
      }).on('error', (err) => {
        file.close()
        fs.unlink(dest, () => {})
        reject(err)
      })
    }

    request(url)
  })
}

/**
 * Initializes the customized SourceForge-based updater.
 */
export function initUpdater(): void {
  const platformMap: Record<string, string> = {
    darwin: 'mac',
    win32: 'windows',
    linux: 'linux'
  }

  // ── 1. Update Check Handler ─────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    try {
      const data = await fetchJson('https://sourceforge.net/projects/open-gamma/best_release.json')

      const platformKey = platformMap[process.platform]
      if (!platformKey) {
        throw new Error(`Unsupported OS platform for updates: ${process.platform}`)
      }

      const releaseInfo = data.platform_releases?.[platformKey] || data.release
      if (!releaseInfo) {
        throw new Error('No release details found for this platform.')
      }

      const filename = releaseInfo.filename || ''
      const versionMatch = filename.match(/v?(\d+\.\d+\.\d+)/i)
      if (!versionMatch) {
        throw new Error(`Could not parse version from filename: ${filename}`)
      }
      const latestVersion = versionMatch[1]
      const currentVersion = app.getVersion()

      let downloadUrl = releaseInfo.url
      let displayFilename = path.basename(filename)

      // macOS Architecture adjustment (Intel vs. Apple Silicon)
      if (process.platform === 'darwin') {
        const currentArch = process.arch
        if (currentArch === 'x64' && displayFilename.includes('arm64')) {
          displayFilename = displayFilename.replace('arm64', 'x64')
          downloadUrl = downloadUrl.replace('arm64', 'x64')
        } else if (currentArch === 'arm64' && displayFilename.includes('x64')) {
          displayFilename = displayFilename.replace('x64', 'arm64')
          downloadUrl = downloadUrl.replace('x64', 'arm64')
        }
      }

      const isAvailable = compareVersions(latestVersion, currentVersion) > 0

      return {
        available: isAvailable,
        latestVersion,
        currentVersion,
        downloadUrl,
        filename: displayFilename
      }
    } catch (err: any) {
      console.error('[updater] Update check failed:', err)
      return {
        available: false,
        latestVersion: '',
        currentVersion: app.getVersion(),
        downloadUrl: '',
        filename: '',
        error: err.message || 'Unknown check error'
      }
    }
  })

  // ── 2. Download Installer Handler ───────────────────────────────────────────
  ipcMain.handle('updater:download', async (_event, downloadUrl: string, filename: string) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) {
      return { success: false, error: 'Application main window not found' }
    }

    try {
      const tempDir = os.tmpdir()
      const destPath = path.join(tempDir, filename)

      // Start the download with periodic chunk percentage progress notifications
      await downloadFile(downloadUrl, destPath, (percent) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:download-progress', percent)
        }
      })

      return { success: true, filePath: destPath }
    } catch (err: any) {
      console.error('[updater] Download failed:', err)
      return { success: false, error: err.message || 'Unknown download error' }
    }
  })

  // ── 3. Launch & Install Handler ─────────────────────────────────────────────
  ipcMain.handle('updater:install', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Downloaded installer file missing: ${filePath}`)
      }

      if (process.platform === 'win32') {
        // Detached spawn allows the installer to persist after the main app closes
        const child = spawn(filePath, [], {
          detached: true,
          stdio: 'ignore'
        })
        child.unref()
        app.quit()
        return { success: true }
      } else {
        // macOS mounts/opens DMG file; Linux opens the AppImage file
        await shell.openPath(filePath)
        return { success: true }
      }
    } catch (err: any) {
      console.error('[updater] Launch install failed:', err)
      return { success: false, error: err.message || 'Unknown launch error' }
    }
  })
}
