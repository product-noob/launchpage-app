import { describe, it, expect } from 'vitest'

/**
 * Tests for the in-memory apps cache pattern used in main.ts.
 * We test the caching logic in isolation to verify:
 * - Cache hit returns data without disk read
 * - Cache miss reads from disk
 * - writeApps updates the cache
 * - Returned arrays are shallow copies (callers can't corrupt the cache)
 */

interface AppEntry {
  id: string
  name: string
  type: string
  path?: string
  command?: string
}

function createAppsStore() {
  let cache: { apps: AppEntry[] } | null = null
  let diskContent: string | null = null
  let diskReadCount = 0

  function readApps(): { apps: AppEntry[] } {
    if (cache) return { apps: [...cache.apps] }
    diskReadCount++
    if (!diskContent) return { apps: [] }
    try {
      const raw = JSON.parse(diskContent)
      if (!raw || !Array.isArray(raw.apps)) return { apps: [] }
      cache = { apps: raw.apps }
      return { apps: [...raw.apps] }
    } catch {
      return { apps: [] }
    }
  }

  function writeApps(data: { apps: AppEntry[] }): void {
    diskContent = JSON.stringify(data, null, 2)
    cache = data
  }

  function setDiskContent(json: string): void {
    diskContent = json
    cache = null // simulate external change
  }

  return { readApps, writeApps, setDiskContent, getDiskReadCount: () => diskReadCount }
}

describe('apps cache', () => {
  it('returns empty array when no file exists', () => {
    const store = createAppsStore()
    expect(store.readApps()).toEqual({ apps: [] })
    expect(store.getDiskReadCount()).toBe(1)
  })

  it('caches after first read — no extra disk reads', () => {
    const store = createAppsStore()
    store.setDiskContent(JSON.stringify({
      apps: [{ id: 'a', name: 'A', type: 'vite', path: '/a', command: 'cmd' }],
    }))

    const first = store.readApps()
    const second = store.readApps()
    const third = store.readApps()

    expect(first.apps).toHaveLength(1)
    expect(second.apps).toHaveLength(1)
    expect(third.apps).toHaveLength(1)
    expect(store.getDiskReadCount()).toBe(1)
  })

  it('writeApps updates the cache so next read hits cache', () => {
    const store = createAppsStore()
    const newData = {
      apps: [
        { id: 'x', name: 'X', type: 'node', path: '/x', command: 'node' },
        { id: 'y', name: 'Y', type: 'vite', path: '/y', command: 'vite' },
      ],
    }
    store.writeApps(newData)

    const result = store.readApps()
    expect(result.apps).toHaveLength(2)
    expect(result.apps[0].id).toBe('x')
    expect(store.getDiskReadCount()).toBe(0)
  })

  it('readApps returns a shallow copy — mutation does not corrupt cache', () => {
    const store = createAppsStore()
    store.writeApps({
      apps: [{ id: 'a', name: 'A', type: 'vite', path: '/a', command: 'cmd' }],
    })

    const result = store.readApps()
    result.apps.push({ id: 'injected', name: 'Injected', type: 'node', path: '/', command: 'x' })

    const fresh = store.readApps()
    expect(fresh.apps).toHaveLength(1)
    expect(fresh.apps[0].id).toBe('a')
  })

  it('handles corrupt disk content gracefully', () => {
    const store = createAppsStore()
    store.setDiskContent('not valid json{{{')
    expect(store.readApps()).toEqual({ apps: [] })
  })

  it('handles disk content without apps array', () => {
    const store = createAppsStore()
    store.setDiskContent(JSON.stringify({ version: 1 }))
    expect(store.readApps()).toEqual({ apps: [] })
  })

  it('external setDiskContent invalidates cache', () => {
    const store = createAppsStore()
    store.writeApps({
      apps: [{ id: 'old', name: 'Old', type: 'node', path: '/', command: 'x' }],
    })

    store.setDiskContent(JSON.stringify({
      apps: [{ id: 'new', name: 'New', type: 'vite', path: '/', command: 'y' }],
    }))

    const result = store.readApps()
    expect(result.apps[0].id).toBe('new')
  })

  it('multiple writes always reflect latest data', () => {
    const store = createAppsStore()

    store.writeApps({ apps: [{ id: '1', name: '1', type: 'a', path: '/', command: 'x' }] })
    store.writeApps({ apps: [{ id: '2', name: '2', type: 'b', path: '/', command: 'y' }] })
    store.writeApps({ apps: [] })

    expect(store.readApps().apps).toHaveLength(0)
    expect(store.getDiskReadCount()).toBe(0)
  })
})
