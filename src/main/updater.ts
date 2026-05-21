import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

/**
 * Resolves the currently active main window safely.
 */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] ?? null
}

/**
 * Initializes the auto-updater with silent background update checks
 * and downloads, forwarding events to the renderer.
 */
export function initUpdater(): void {
  // Configure electron-updater logger
  autoUpdater.logger = console

  // Download update automatically in the background
  autoUpdater.autoDownload = true

  // Log update availability without notifying the user at this stage
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update available:', info.version, '. Downloading in background...')
  })

  // When update is fully downloaded, notify the renderer process via IPC
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Update downloaded:', info.version)
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-ready')
    }
  })

  // Log error silently, avoiding app crashes
  autoUpdater.on('error', (err) => {
    console.error('[updater] Error during update lifecycle:', err)
  })

  // IPC listener for restarting and applying the downloaded update
  ipcMain.on('updater:restart', () => {
    console.log('[updater] Restarting and installing update...')
    try {
      autoUpdater.quitAndInstall()
    } catch (err) {
      console.error('[updater] Failed to execute quitAndInstall:', err)
    }
  })

  // Perform the initial update check silently
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[updater] Failed silent check for updates:', err)
  })
}
