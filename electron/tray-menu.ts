import { Menu, shell } from 'electron'
import { getAllStatuses } from './process-manager.ts'
import { readApps } from './config-store.ts'
import { startAppEntry, stopAppEntry } from './ipc-handlers.ts'

export function buildTrayContextMenu(onOpenConsole: () => void, onQuit: () => void): Electron.Menu {
  const { apps } = readApps()
  const statuses = getAllStatuses()

  const appItems: Electron.MenuItemConstructorOptions[] = apps.map(appEntry => {
    const isGrouped = appEntry.type === 'grouped' && appEntry.components
    let appStatus = 'stopped'

    if (isGrouped && appEntry.components) {
      const compStatuses = appEntry.components.map(c => statuses[c.id]?.status || 'stopped')
      if (compStatuses.every(s => s === 'running')) appStatus = 'running'
      else if (compStatuses.some(s => s === 'error')) appStatus = 'error'
      else if (compStatuses.some(s => s === 'starting' || s === 'running')) appStatus = 'starting'
    } else {
      appStatus = statuses[appEntry.id]?.status || 'stopped'
    }

    const statusEmoji = appStatus === 'running' ? '  [running]' : appStatus === 'error' ? '  [error]' : appStatus === 'starting' ? '  [starting]' : ''
    const isRunning = appStatus === 'running' || appStatus === 'starting'

    const submenu: Electron.MenuItemConstructorOptions[] = []
    if (isRunning) {
      submenu.push({
        label: 'Stop',
        click: () => { stopAppEntry(appEntry) },
      })
      if (appEntry.port || (isGrouped && appEntry.components?.some(c => c.port))) {
        submenu.push({
          label: 'Open in Browser',
          click: () => {
            const port = appEntry.port || appEntry.components?.find(c => c.port)?.port
            if (port) shell.openExternal(`http://localhost:${port}`)
          },
        })
      }
    } else {
      submenu.push({
        label: 'Start',
        click: () => { startAppEntry(appEntry) },
      })
    }

    return {
      label: `${appEntry.name}${statusEmoji}`,
      submenu,
    }
  })

  return Menu.buildFromTemplate([
    ...appItems,
    { type: 'separator' },
    {
      label: 'Open Console',
      click: onOpenConsole,
    },
    { type: 'separator' },
    {
      label: 'Quit Launchpad',
      click: onQuit,
    },
  ])
}
