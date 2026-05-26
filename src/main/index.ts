import { app, shell, BrowserWindow, Menu, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { initDb } from './db'
import { createApplicationMenu } from './menu'
import { initUpdater } from './updater'
import * as os from 'os'
import * as path from 'path'

// Explicitly set the application name so dev and production use the same userData directory
app.name = 'Open Gamma'

// ─── PATH Enrichment (packaged app fix) ───────────────────────────────────────
// Electron packaged apps on macOS/Linux start without the user's shell PATH.
// This means CLIs installed via Homebrew, npm global, nvm etc. are invisible.
// We inject known install directories at startup so child processes can find them.
function enrichProcessPath(): void {
  const home = os.homedir()
  const platform = process.platform

  const extraPaths: string[] = []

  if (platform === 'darwin' || platform === 'linux') {
    extraPaths.push(
      '/opt/homebrew/bin',          // Homebrew (Apple Silicon)
      '/opt/homebrew/sbin',
      '/usr/local/bin',             // Homebrew (Intel) / system
      '/usr/local/sbin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
      path.join(home, '.volta', 'bin'),      // Volta
      path.join(home, '.npm-global', 'bin'), // npm global (custom prefix)
      path.join(home, '.yarn', 'bin'),       // Yarn global
      path.join(home, '.pnpm', 'bin'),       // pnpm global
      path.join(home, '.local', 'bin'),      // Linux user local bin
      path.join(home, '.cargo', 'bin'),      // Cargo/Rust
      path.join(home, 'bin'),
      '/opt/local/bin',                      // MacPorts
    )
  } else if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    extraPaths.push(
      path.join(appData, 'npm'),
      path.join(localAppData, 'Programs', 'nodejs'),
    )
  }

  const currentPath = process.env.PATH || ''
  const currentPaths = new Set(currentPath.split(path.delimiter).filter(Boolean))

  const newPaths = extraPaths.filter((p) => !currentPaths.has(p))
  if (newPaths.length > 0) {
    process.env.PATH = [...newPaths, ...currentPaths].join(path.delimiter)
    console.log('[main] Enriched PATH with extra dirs:', newPaths.join(', '))
  }
}

enrichProcessPath()

// Register privileged scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'og-audio',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

// ─── Window Factory ───────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    title: 'Open Gamma',
    titleBarStyle: 'hidden',
    backgroundColor: '#0d0d0d',
    trafficLightPosition: { x: 14, y: 10 },
    // Show icon on Windows and Linux; macOS handles this via app bundle
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, // renderer cannot access Node internals
      nodeIntegration: false, // never expose Node.js to the renderer
      sandbox: false // required so the preload script can run
    }
  })

  // ── Show only once the DOM is ready (avoids white-flash on cold start) ──────
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // ── Intercept new-window / target="_blank" — open in system browser ─────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ── Remove the native menu on Windows / Linux ────────────────────────────────
  // macOS keeps its menu bar; Windows and Linux look cleaner without it.
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  // ── Load the app ─────────────────────────────────────────────────────────────
  // In development electron-vite sets ELECTRON_RENDERER_URL to the Vite HMR
  // dev-server. In production we load the built index.html from disk.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  return mainWindow
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Register local audio protocol handler.
  // URLs are in the form og-audio://localhost/absolute/path/to/file.wav
  // Strip the og-audio://localhost prefix to get the raw OS absolute path.
  protocol.handle('og-audio', (request) => {
    const urlObj = new URL(request.url)
    // urlObj.pathname is the URL-encoded absolute path portion, e.g. /tmp/opengamma-audio/slide.wav
    const absPath = decodeURIComponent(urlObj.pathname)
    return net.fetch(pathToFileURL(absPath).toString())
  })

  // Set the Windows app-user-model-id (used by the taskbar & notifications)
  electronApp.setAppUserModelId('app.opengamma')

  // Toggle DevTools with F12 in dev; disable Ctrl/Cmd+R reload in production
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize SQLite Database
  initDb()

  // Register all IPC handlers before creating the window so the renderer
  // never fires a channel that has no handler yet
  registerIpcHandlers()

  // Warm up the CLI tools cache
  import('./cliScanner').then((scanner) => {
    scanner.scanInstalledCLIs().catch((err) => {
      console.error('[main] Background CLI scan failed:', err)
    })
  })

  const mainWindow = createWindow()
  initUpdater()
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: 'Open Gamma',
      applicationVersion: app.getVersion(),
      copyright: 'Copyright © 2026 OpenGamma Team',
      credits: 'Built with React, Electron & Reveal.js'
    })
    createApplicationMenu(mainWindow)
  }

  // macOS: re-create the window when the dock icon is clicked and no windows
  // are open (standard macOS behaviour)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow()
      if (process.platform === 'darwin') {
        createApplicationMenu(win)
      }
    }
  })
})

// Quit on all windows closed — except on macOS where the menu bar stays alive
// until the user explicitly quits with Cmd+Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
