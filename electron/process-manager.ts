import type { ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

import { checkPort, findFreePort, probePort, portFlagForType, commandHasPortFlag, detectPortFlagFromCommand, injectPortFlag } from './port-utils.ts'
import { schedulePidSave } from './pid-registry.ts'
import { spawnProcess, killProcessTree, detectVenv } from './platform.ts'
// Re-export pid-registry functions used by main.ts
export { setPidFilePath, cleanupOrphanedProcesses } from './pid-registry.ts'

export type AppStatus = 'stopped' | 'starting' | 'running' | 'error'

interface ManagedProcess {
  process: ChildProcess | null
  pid: number
  status: AppStatus
  logs: string[]
  startedAt: number
  errorMessage?: string
  port?: number
}

const processes = new Map<string, ManagedProcess>()

const MAX_LOG_LINES = 500
const PORT_CHECK_INTERVAL_MS = 2000
const PORT_CHECK_MAX_DURATION_MS = 30_000
const SILENT_PROMOTION_TIMEOUT_MS = 3000
const SIGKILL_TIMEOUT_MS = 5000

// --- Log listener with micro-batching ---
type LogListener = (id: string, lines: string[]) => void
let logListener: LogListener | null = null
let pendingLogBroadcast = new Map<string, string[]>()
let logBroadcastScheduled = false

export function setLogListener(listener: LogListener | null): void {
  logListener = listener
}

function notifyLogListener(id: string, line: string): void {
  if (!logListener) return
  let pending = pendingLogBroadcast.get(id)
  if (!pending) { pending = []; pendingLogBroadcast.set(id, pending) }
  pending.push(line)
  if (!logBroadcastScheduled) {
    logBroadcastScheduled = true
    process.nextTick(() => {
      logBroadcastScheduled = false
      const batch = pendingLogBroadcast
      pendingLogBroadcast = new Map()
      const listener = logListener
      if (!listener) return
      for (const [appId, lines] of batch) {
        listener(appId, lines)
      }
    })
  }
}

export function hasActiveProcesses(): boolean {
  for (const managed of processes.values()) {
    if (managed.status === 'running' || managed.status === 'starting') return true
  }
  return false
}


function appendLog(id: string, line: string) {
  const managed = processes.get(id)
  if (!managed) return
  managed.logs.push(line)
  if (managed.logs.length > MAX_LOG_LINES) {
    managed.logs.splice(0, managed.logs.length - MAX_LOG_LINES)
  }
  notifyLogListener(id, line)
}

export async function startApp(id: string, appPath: string, command: string, port?: number, type?: string): Promise<{ ok: boolean; error?: string }> {
  const existing = processes.get(id)
  if (existing && (existing.status === 'running' || existing.status === 'starting')) {
    return { ok: true }
  }

  const timestamp = () => new Date().toLocaleTimeString()

  if (!fs.existsSync(appPath)) {
    const errorMsg = `Working directory does not exist: ${appPath}`
    const managed: ManagedProcess = {
      process: null, pid: 0, status: 'error',
      logs: [`[${timestamp()}] ${errorMsg}`],
      startedAt: Date.now(), errorMessage: errorMsg,
    }
    processes.set(id, managed)
    return { ok: false, error: errorMsg }
  }

  // Resolve port -if configured port is busy, auto-find a free one
  let resolvedPort = port
  if (port) {
    const inUse = await checkPort(port)
    if (inUse) {
      resolvedPort = await findFreePort(port + 1)
    }
  }

  // Build environment with venv if detected
  const env = { ...process.env }
  const venvBin = detectVenv(appPath)
  if (venvBin) {
    env.PATH = `${venvBin}${path.delimiter}${env.PATH}`
    env.VIRTUAL_ENV = path.dirname(venvBin)
  }

  if (resolvedPort) {
    env.PORT = String(resolvedPort)
  }

  const lines = command.split('\n').map(l => l.trim()).filter(Boolean)

  // Inject port flag when port was reassigned and the command doesn't already have one
  if (resolvedPort && resolvedPort !== port && !commandHasPortFlag(command)) {
    const flagFn = (type ? portFlagForType[type] : undefined)
      || detectPortFlagFromCommand(lines[lines.length - 1])
    if (flagFn) {
      const flag = flagFn(resolvedPort)
      lines[lines.length - 1] = injectPortFlag(lines[lines.length - 1], flag)
    }
  }

  const shellCommand = lines.join(' && ')
  const child = spawnProcess(shellCommand, appPath, env)

  const managed: ManagedProcess = {
    process: child, pid: child.pid!, status: 'starting',
    logs: [], startedAt: Date.now(), port: resolvedPort,
  }
  processes.set(id, managed)
  schedulePidSave(processes)

  appendLog(id, `[${timestamp()}] Starting: ${shellCommand}`)
  appendLog(id, `[${timestamp()}] Working directory: ${appPath}`)
  if (venvBin) {
    appendLog(id, `[${timestamp()}] Activated venv: ${path.dirname(venvBin)}`)
  }
  if (resolvedPort && resolvedPort !== port) {
    appendLog(id, `[${timestamp()}] Port ${port} in use -reassigned to ${resolvedPort}`)
  }
  appendLog(id, '')

  const promoteToRunning = () => {
    if (managed.status === 'starting') {
      managed.status = 'running'
      if (resolvedPort) {
        const portCheck = setInterval(async () => {
          if (managed.status !== 'running') { clearInterval(portCheck); return }
          const listening = await probePort(resolvedPort!)
          if (listening) clearInterval(portCheck)
        }, PORT_CHECK_INTERVAL_MS)
        setTimeout(() => clearInterval(portCheck), PORT_CHECK_MAX_DURATION_MS)
      }
    }
  }

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line.trim()) appendLog(id, line)
    }
    promoteToRunning()
  })

  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line.trim()) appendLog(id, line)
    }
    promoteToRunning()
  })

  child.on('error', (err) => {
    managed.status = 'error'
    managed.errorMessage = err.message
    appendLog(id, `[${timestamp()}] Error: ${err.message}`)
    schedulePidSave(processes)
  })

  child.on('exit', (code, signal) => {
    if (managed.status === 'stopped') return
    if (code !== null && code !== 0) {
      managed.status = 'error'
      managed.errorMessage = `Process exited with code ${code}`
      appendLog(id, `[${timestamp()}] Exited with code ${code}`)
    } else if (signal) {
      appendLog(id, `[${timestamp()}] Killed by signal ${signal}`)
      managed.status = 'stopped'
    } else {
      managed.status = 'stopped'
      appendLog(id, `[${timestamp()}] Process ended`)
    }
    schedulePidSave(processes)
  })

  setTimeout(() => {
    promoteToRunning()
  }, SILENT_PROMOTION_TIMEOUT_MS)

  return { ok: true }
}

export function stopApp(id: string): Promise<void> {
  return new Promise((resolve) => {
    const managed = processes.get(id)
    if (!managed || managed.status === 'stopped' || !managed.pid) {
      if (managed) managed.status = 'stopped'
      resolve()
      return
    }

    const timestamp = () => new Date().toLocaleTimeString()
    managed.status = 'stopped'
    schedulePidSave(processes)
    appendLog(id, `[${timestamp()}] Stopping...`)

    const child = managed.process
    if (child && !child.killed) {
      killProcessTree(managed.pid, 'SIGTERM')

      const forceKillTimeout = setTimeout(() => {
        if (!child.killed) {
          killProcessTree(managed.pid, 'SIGKILL')
          appendLog(id, `[${timestamp()}] Force killed (SIGKILL)`)
        }
        resolve()
      }, SIGKILL_TIMEOUT_MS)

      child.on('exit', () => {
        clearTimeout(forceKillTimeout)
        appendLog(id, `[${timestamp()}] Stopped`)
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export function getStatus(id: string): AppStatus {
  const managed = processes.get(id)
  if (!managed) return 'stopped'
  if (managed.process !== null && managed.process.exitCode !== null && managed.status !== 'stopped' && managed.status !== 'error') {
    managed.status = managed.process.exitCode === 0 ? 'stopped' : 'error'
  }
  return managed.status
}

export function getErrorMessage(id: string): string | undefined {
  return processes.get(id)?.errorMessage
}

export function getLogs(id: string): string[] {
  const managed = processes.get(id)
  if (!managed) return []
  return [...managed.logs]
}

export function clearLogs(id: string): void {
  const managed = processes.get(id)
  if (managed) managed.logs = []
}

export function getAllStatuses(): Record<string, { status: AppStatus; error?: string; pid?: number; startedAt?: number; port?: number }> {
  const result: Record<string, { status: AppStatus; error?: string; pid?: number; startedAt?: number; port?: number }> = {}
  for (const [id, managed] of processes) {
    result[id] = {
      status: getStatus(id),
      error: getErrorMessage(id),
      pid: managed.pid || undefined,
      startedAt: managed.startedAt,
      port: managed.port,
    }
  }
  return result
}

export async function killAll(): Promise<void> {
  const promises: Promise<void>[] = []
  for (const [id, managed] of processes) {
    if (managed.status === 'running' || managed.status === 'starting') {
      promises.push(stopApp(id))
    }
  }
  await Promise.all(promises)
}
