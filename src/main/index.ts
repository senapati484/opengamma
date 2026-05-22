import { app, shell, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { initDb } from './db'
import { createApplicationMenu } from './menu'
import { initUpdater } from './updater'

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
    // Show icon on Linux; macOS and Windows handle this via app bundle / exe
    ...(process.platform === 'linux' ? { icon } : {}),
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
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
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
