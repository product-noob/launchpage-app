import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import type { AppEntry } from '../shared/types.ts'

export function getAppsJsonPath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(process.env.DIST_ELECTRON!, '..', 'apps.json')
  }
  const userDataPath = path.join(app.getPath('userData'), 'apps.json')
  if (!fs.existsSync(userDataPath)) {
    const bundledPath = path.join(process.resourcesPath, 'apps.json')
    if (fs.existsSync(bundledPath)) {
      fs.copyFileSync(bundledPath, userDataPath)
    }
  }
  return userDataPath
}

export function validateAppEntry(entry: unknown): entry is AppEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  if (typeof e.id !== 'string' || typeof e.name !== 'string' || typeof e.type !== 'string') return false
  if (e.type === 'grouped') {
    if (!Array.isArray(e.components)) return false
    return e.components.every((c: unknown) => {
      if (!c || typeof c !== 'object') return false
      const comp = c as Record<string, unknown>
      return typeof comp.id === 'string' && typeof comp.name === 'string' &&
        typeof comp.path === 'string' && typeof comp.command === 'string' && typeof comp.type === 'string'
    })
  }
  return typeof e.path === 'string' && typeof e.command === 'string'
}

let appsCache: { apps: AppEntry[] } | null = null

export function readApps(): { apps: AppEntry[] } {
  if (appsCache) return { apps: [...appsCache.apps] }
  const appsPath = getAppsJsonPath()
  if (!fs.existsSync(appsPath)) return { apps: [] }
  try {
    const raw = JSON.parse(fs.readFileSync(appsPath, 'utf-8'))
    if (!raw || !Array.isArray(raw.apps)) return { apps: [] }
    const valid = raw.apps.filter((entry: unknown) => {
      if (validateAppEntry(entry)) return true
      console.warn('Skipping invalid app entry:', entry)
      return false
    })
    appsCache = { apps: valid }
    return { apps: [...valid] }
  } catch (err) {
    console.error('Failed to read apps.json:', err)
    const bakPath = appsPath + '.bak'
    if (fs.existsSync(bakPath)) {
      try {
        const backup = JSON.parse(fs.readFileSync(bakPath, 'utf-8'))
        if (backup && Array.isArray(backup.apps)) {
          console.log('Restored from backup apps.json.bak')
          const valid = backup.apps.filter((entry: unknown) => validateAppEntry(entry))
          appsCache = { apps: valid }
          return { apps: [...valid] }
        }
      } catch { /* backup also corrupt, return empty */ }
    }
    return { apps: [] }
  }
}

export function writeApps(data: { apps: AppEntry[] }): void {
  const appsPath = getAppsJsonPath()
  try {
    if (fs.existsSync(appsPath)) {
      fs.copyFileSync(appsPath, appsPath + '.bak')
    }
    const tmpPath = appsPath + `.tmp-${Date.now()}`
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2))
    fs.renameSync(tmpPath, appsPath)
    appsCache = data
  } catch (err) {
    console.error('Failed to write apps.json:', err)
    throw err
  }
}

export function invalidateCache(): void {
  appsCache = null
}
