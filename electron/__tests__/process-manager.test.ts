import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  getLogs,
  clearLogs,
  getAllStatuses,
  getStatus,
  getErrorMessage,
  setLogListener,
  setPidFilePath,
  cleanupOrphanedProcesses,
  hasActiveProcesses,
  startApp,
  stopApp,
} from '../process-manager.ts'

// ── Log listener tests ──────────────────────────────────────────────────────

describe('setLogListener / log streaming', () => {
  afterEach(() => {
    setLogListener(null)
  })

  it('calls the listener with batched lines when logs are appended', async () => {
    const received: { id: string; lines: string[] }[] = []
    setLogListener((id, lines) => received.push({ id, lines }))

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('log-test-1', tmpDir, 'echo "hello world"')

    // Wait for process to complete and nextTick batching to flush
    await new Promise(r => setTimeout(r, 500))

    expect(received.length).toBeGreaterThan(0)
    expect(received[0].id).toBe('log-test-1')
    expect(received[0].lines.length).toBeGreaterThan(0)

    await stopApp('log-test-1')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('does not call listener when none is set', async () => {
    const received: unknown[] = []
    setLogListener((id, lines) => received.push({ id, lines }))
    setLogListener(null)

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('log-test-2', tmpDir, 'echo "silent"')
    await new Promise(r => setTimeout(r, 500))

    expect(received.length).toBe(0)

    await stopApp('log-test-2')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── getLogs / clearLogs tests ───────────────────────────────────────────────

describe('getLogs / clearLogs', () => {
  it('returns empty array for unknown app', () => {
    expect(getLogs('nonexistent')).toEqual([])
  })

  it('returns logs after app starts and clears them', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('log-app', tmpDir, 'echo "test output"')
    await new Promise(r => setTimeout(r, 500))

    const logs = getLogs('log-app')
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some(l => l.includes('Starting:'))).toBe(true)

    clearLogs('log-app')
    expect(getLogs('log-app')).toEqual([])

    await stopApp('log-app')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('getLogs returns a copy, not a reference', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('copy-test', tmpDir, 'echo "data"')
    await new Promise(r => setTimeout(r, 500))

    const logs1 = getLogs('copy-test')
    const logs2 = getLogs('copy-test')
    expect(logs1).toEqual(logs2)
    expect(logs1).not.toBe(logs2)

    await stopApp('copy-test')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── PID persistence tests ───────────────────────────────────────────────────

describe('PID persistence', () => {
  let pidFile: string
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-test-'))
    pidFile = path.join(tmpDir, 'pids.json')
    setPidFilePath(pidFile)
  })

  afterEach(() => {
    setPidFilePath('')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('saves PID file after starting an app', async () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('pid-test-app', appDir, 'sleep 10')

    // Wait for nextTick PID save to flush
    await new Promise(r => setTimeout(r, 100))

    expect(fs.existsSync(pidFile)).toBe(true)
    const data = JSON.parse(fs.readFileSync(pidFile, 'utf-8'))
    expect(data['pid-test-app']).toBeDefined()
    expect(data['pid-test-app'].pid).toBeGreaterThan(0)
    expect(typeof data['pid-test-app'].startedAt).toBe('number')

    await stopApp('pid-test-app')
    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('removes app from PID file after stopping', async () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('pid-stop-app', appDir, 'sleep 10')
    await new Promise(r => setTimeout(r, 100))

    await stopApp('pid-stop-app')
    await new Promise(r => setTimeout(r, 100))

    const data = JSON.parse(fs.readFileSync(pidFile, 'utf-8'))
    expect(data['pid-stop-app']).toBeUndefined()

    fs.rmSync(appDir, { recursive: true, force: true })
  })

  it('cleanupOrphanedProcesses handles missing PID file gracefully', () => {
    fs.rmSync(pidFile, { force: true })
    expect(() => cleanupOrphanedProcesses()).not.toThrow()
  })

  it('cleanupOrphanedProcesses handles corrupt PID file gracefully', () => {
    fs.writeFileSync(pidFile, 'not json{{{')
    expect(() => cleanupOrphanedProcesses()).not.toThrow()
  })

  it('cleanupOrphanedProcesses removes the PID file after cleanup', () => {
    fs.writeFileSync(pidFile, JSON.stringify({ 'dead-app': { pid: 999999, startedAt: 0 } }))
    cleanupOrphanedProcesses()
    expect(fs.existsSync(pidFile)).toBe(false)
  })
})

// ── Status / error tests ────────────────────────────────────────────────────

describe('getStatus / getErrorMessage / getAllStatuses', () => {
  it('returns stopped for unknown app', () => {
    expect(getStatus('unknown-app')).toBe('stopped')
  })

  it('returns undefined error for unknown app', () => {
    expect(getErrorMessage('unknown-app')).toBeUndefined()
  })

  it('sets error status when working directory does not exist', async () => {
    const result = await startApp('bad-path', '/nonexistent/path/that/does/not/exist', 'echo hi')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('does not exist')
    expect(getStatus('bad-path')).toBe('error')
    expect(getErrorMessage('bad-path')).toContain('does not exist')
  })

  it('getAllStatuses includes started apps', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('status-app', tmpDir, 'sleep 10')
    await new Promise(r => setTimeout(r, 100))

    const statuses = getAllStatuses()
    expect(statuses['status-app']).toBeDefined()
    expect(['starting', 'running']).toContain(statuses['status-app'].status)

    await stopApp('status-app')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── hasActiveProcesses tests ────────────────────────────────────────────────

describe('hasActiveProcesses', () => {
  it('returns true when a process is running', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('active-test', tmpDir, 'sleep 10')
    await new Promise(r => setTimeout(r, 100))

    expect(hasActiveProcesses()).toBe(true)

    await stopApp('active-test')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── startApp / stopApp lifecycle tests ──────────────────────────────────────

describe('startApp / stopApp', () => {
  it('returns ok: true for a valid app', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    const result = await startApp('lifecycle-1', tmpDir, 'sleep 5')
    expect(result.ok).toBe(true)

    await stopApp('lifecycle-1')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns ok: true when starting an already-running app (idempotent)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('idempotent-1', tmpDir, 'sleep 10')
    const result = await startApp('idempotent-1', tmpDir, 'sleep 10')
    expect(result.ok).toBe(true)

    await stopApp('idempotent-1')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('stopApp resolves cleanly for unknown app', async () => {
    await expect(stopApp('totally-unknown')).resolves.toBeUndefined()
  })

  it('app status transitions to stopped after stopApp', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    await startApp('stop-test', tmpDir, 'sleep 10')
    await new Promise(r => setTimeout(r, 100))

    await stopApp('stop-test')
    expect(getStatus('stop-test')).toBe('stopped')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
