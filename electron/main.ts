import { app, BrowserWindow, Tray, ipcMain, nativeImage, screen, globalShortcut } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

import { getAllStatuses, killAll, setLogListener, setPidFilePath, cleanupOrphanedProcesses } from './process-manager.ts'
import { readApps } from './config-store.ts'
import { setupIPC, startAppEntry } from './ipc-handlers.ts'
import { buildTrayContextMenu } from './tray-menu.ts'

process.env.DIST_ELECTRON = path.join(__dirname)
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Single-instance lock -prevent multiple copies from running
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let win: BrowserWindow | null = null
let consoleWin: BrowserWindow | null = null
let tray: Tray | null = null
let statusInterval: ReturnType<typeof setInterval> | null = null
let isQuitting = false
let isDialogOpen = false

export function getMainWindow(): BrowserWindow | null {
  return win
}

export function setDialogOpen(open: boolean) {
  isDialogOpen = open
}


// ── App Icon (for window titlebar / taskbar on Windows) ──

function getAppIcon(): Electron.NativeImage | undefined {
  if (process.platform !== 'win32') return undefined
  const iconDir = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.env.DIST_ELECTRON!, '..', 'resources')
    : path.join(process.resourcesPath)
  const iconPath = path.join(iconDir, 'icon.png')
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath)
  }
  return undefined
}

// ── Tray Icon ──

function createTrayIcon(): Electron.NativeImage {
  const iconDir = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.env.DIST_ELECTRON!, '..', 'resources')
    : path.join(process.resourcesPath)
  const iconPath = path.join(iconDir, 'trayIconTemplate.png')
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath)
    if (process.platform === 'darwin') img.setTemplateImage(true)
    return img
  }
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 4; y < 12; y++) {
    for (let x = 4; x < 12; x++) {
      const idx = (y * size + x) * 4
      buf[idx + 3] = 255
    }
  }
  const img = nativeImage.createFromBuffer(buf, { width: size, height: size })
  if (process.platform === 'darwin') img.setTemplateImage(true)
  return img
}

// ── Windows ──

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#171717',
    ...(process.platform === 'darwin' ? { vibrancy: 'menu' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.setAlwaysOnTop(true, 'pop-up-menu')
  } else {
    win.setAlwaysOnTop(true)
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  win.on('blur', () => {
    if (!isDialogOpen) {
      win?.hide()
    }
  })
}

function createConsoleWindow(showImmediately = true) {
  if (consoleWin && !consoleWin.isDestroyed()) {
    if (showImmediately) {
      consoleWin.show()
      consoleWin.focus()
      app.dock?.show()
    }
    return
  }

  consoleWin = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    icon: getAppIcon(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#171717',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    consoleWin.loadURL(process.env.VITE_DEV_SERVER_URL + '#/console')
  } else {
    consoleWin.loadFile(path.join(process.env.DIST!, 'index.html'), { hash: '/console' })
  }

  if (showImmediately) {
    consoleWin.once('ready-to-show', () => {
      consoleWin?.show()
      app.dock?.show()
    })
  }

  // Hide instead of destroy so re-opens are instant
  consoleWin.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      consoleWin?.hide()
      app.dock?.hide()
    }
  })
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
    return
  }
  if (tray) {
    const trayBounds = tray.getBounds()
    const winBounds = win.getBounds()
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
    // On Windows the tray is at the bottom; position window above it
    const yOffset = process.platform === 'win32'
      ? trayBounds.y - winBounds.height
      : trayBounds.y + trayBounds.height
    let y = Math.round(yOffset)
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
    const { x: sx, y: sy, width: sw, height: sh } = display.workArea
    x = Math.max(sx, Math.min(x, sx + sw - winBounds.width))
    y = Math.max(sy, Math.min(y, sy + sh - winBounds.height))
    win.setPosition(x, y)
  }
  win.show()
  win.focus()
}

// ── Tray Context Menu (see tray-menu.ts) ──

// ── Status Broadcast ──

function startStatusBroadcast() {
  statusInterval = setInterval(() => {
    const windows = BrowserWindow.getAllWindows().filter(bw => !bw.isDestroyed() && bw.isVisible())
    if (windows.length === 0) return
    const statuses = getAllStatuses()
    for (const bw of windows) {
      bw.webContents.send('status:update', statuses)
    }
  }, 1000)
}

// ── App Lifecycle ──

app.on('second-instance', () => {
  if (win) {
    toggleWindow()
  }
})

app.whenReady().then(() => {
  app.dock?.hide()

  setPidFilePath(path.join(app.getPath('userData'), 'pids.json'))
  cleanupOrphanedProcesses()

  setLogListener((id, lines) => {
    for (const bw of BrowserWindow.getAllWindows()) {
      if (!bw.isDestroyed()) {
        bw.webContents.send('log:data', { id, lines })
      }
    }
  })

  createWindow()
  setupIPC()

  // Pre-create console window (hidden) for instant first open
  createConsoleWindow(false)

  // IPC handlers that depend on main-process state
  ipcMain.handle('console:open', () => {
    createConsoleWindow()
    return { ok: true }
  })

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  const trayImage = createTrayIcon()
  tray = new Tray(trayImage)
  tray.setToolTip('Launchpad')
  tray.on('click', toggleWindow)

  tray.on('right-click', () => {
    const menu = buildTrayContextMenu(() => createConsoleWindow(), () => app.quit())
    tray?.popUpContextMenu(menu)
  })

  startStatusBroadcast()
  app.setLoginItemSettings({ openAtLogin: true })

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    toggleWindow()
  })

  // Auto-start apps flagged with autoStart
  try {
    const { apps } = readApps()
    for (const appEntry of apps) {
      if (appEntry.autoStart) {
        startAppEntry(appEntry)
      }
    }
  } catch { /* don't block startup */ }
})

app.on('window-all-closed', () => {
  // Keep running in tray
})

app.on('before-quit', (e) => {
  globalShortcut.unregisterAll()
  if (statusInterval) clearInterval(statusInterval)

  if (!isQuitting) {
    isQuitting = true
    e.preventDefault()
    killAll().finally(() => app.exit())
  }
})
