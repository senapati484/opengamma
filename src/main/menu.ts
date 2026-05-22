import { Menu, app, BrowserWindow, MenuItemConstructorOptions } from 'electron'

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = []

  // App Menu (macOS only)
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: (): void => {
            mainWindow.webContents.send('menu:action', 'settings')
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  // File Menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Presentation',
        accelerator: 'CmdOrCtrl+N',
        click: (): void => {
          mainWindow.webContents.send('menu:action', 'new')
        }
      },
      {
        label: 'Save Presentation',
        accelerator: 'CmdOrCtrl+S',
        click: (): void => {
          mainWindow.webContents.send('menu:action', 'save')
        }
      },
      { type: 'separator' },
      {
        label: 'Export PowerPoint...',
        accelerator: 'CmdOrCtrl+E',
        click: (): void => {
          mainWindow.webContents.send('menu:action', 'export-pptx')
        }
      },
      {
        label: 'Export HTML...',
        click: (): void => {
          mainWindow.webContents.send('menu:action', 'export-html')
        }
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  })

  // Edit Menu
  template.push({
    label: 'Edit',
    submenu: [
      {
        label: 'Undo Slide Edit',
        accelerator: 'CmdOrCtrl+Z',
        click: (): void => {
          mainWindow.webContents.send('menu:action', 'undo')
        }
      },
      { type: 'separator' },
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  })

  // View Menu
  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  })

  // Window Menu
  template.push({
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const }
          ]
        : [{ role: 'close' as const }])
    ]
  })

  // Help Menu
  template.push({
    role: 'help',
    submenu: [
      {
        label: 'Open Gamma Website',
        click: async (): Promise<void> => {
          const { shell } = await import('electron')
          await shell.openExternal('https://opengamma.vercel.app')
        }
      },
      {
        label: 'GitHub Repository',
        click: async (): Promise<void> => {
          const { shell } = await import('electron')
          await shell.openExternal('https://github.com/senapati484/opengamma')
        }
      }
    ]
  })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
