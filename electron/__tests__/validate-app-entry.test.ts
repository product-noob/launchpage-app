import { describe, it, expect } from 'vitest'

/**
 * Mirror of validateAppEntry from main.ts.
 * Tested separately to avoid importing Electron dependencies.
 * If the source changes, this must be updated to match.
 */
function validateAppEntry(entry: unknown): boolean {
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

describe('validateAppEntry', () => {
  it('rejects null and undefined', () => {
    expect(validateAppEntry(null)).toBe(false)
    expect(validateAppEntry(undefined)).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(validateAppEntry('string')).toBe(false)
    expect(validateAppEntry(123)).toBe(false)
    expect(validateAppEntry(true)).toBe(false)
  })

  it('rejects objects missing required fields', () => {
    expect(validateAppEntry({})).toBe(false)
    expect(validateAppEntry({ id: 'x' })).toBe(false)
    expect(validateAppEntry({ id: 'x', name: 'X' })).toBe(false)
    expect(validateAppEntry({ id: 'x', name: 'X', type: 'vite' })).toBe(false) // missing path & command
  })

  it('accepts valid single app entry', () => {
    expect(validateAppEntry({
      id: 'my-app',
      name: 'My App',
      type: 'vite',
      path: '/home/user/app',
      command: 'npm run dev',
    })).toBe(true)
  })

  it('accepts valid single app with optional fields', () => {
    expect(validateAppEntry({
      id: 'my-app',
      name: 'My App',
      type: 'fastapi',
      path: '/home/user/api',
      command: 'uvicorn main:app',
      port: 8000,
      autoStart: true,
      tags: ['backend'],
    })).toBe(true)
  })

  it('rejects grouped app without components', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
    })).toBe(false)
  })

  it('rejects grouped app with non-array components', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
      components: 'not-an-array',
    })).toBe(false)
  })

  it('accepts valid grouped app entry', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
      components: [
        { id: 'fe', name: 'Frontend', path: '/fe', command: 'npm dev', type: 'vite' },
        { id: 'be', name: 'Backend', path: '/be', command: 'python app.py', type: 'fastapi' },
      ],
    })).toBe(true)
  })

  it('rejects grouped app with invalid component', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
      components: [
        { id: 'fe', name: 'Frontend', path: '/fe', command: 'npm dev', type: 'vite' },
        { id: 'bad' }, // missing fields
      ],
    })).toBe(false)
  })

  it('rejects grouped app with null component', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
      components: [null],
    })).toBe(false)
  })

  it('accepts grouped app with empty components array', () => {
    expect(validateAppEntry({
      id: 'grp',
      name: 'Group',
      type: 'grouped',
      components: [],
    })).toBe(true)
  })

  it('rejects when id is not a string', () => {
    expect(validateAppEntry({
      id: 123,
      name: 'App',
      type: 'node',
      path: '/app',
      command: 'node index.js',
    })).toBe(false)
  })
})
