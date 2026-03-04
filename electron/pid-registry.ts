import fs from 'node:fs'
import type { AppStatus } from './process-manager.ts'

let pidFilePath: string | null = null
let pidSaveScheduled = false

export function setPidFilePath(filePath: string): void {
  pidFilePath = filePath
}

export function savePidRegistry(
  processes: Map<string, { pid: number; status: AppStatus; startedAt: number }>
): void {
  if (!pidFilePath) return
  const registry: Record<string, { pid: number; startedAt: number }> = {}
  for (const [id, managed] of processes) {
    if (managed.pid && (managed.status === 'running' || managed.status === 'starting')) {
      registry[id] = { pid: managed.pid, startedAt: managed.startedAt }
    }
  }
  try {
    fs.writeFileSync(pidFilePath, JSON.stringify(registry))
  } catch { /* best effort */ }
}

export function schedulePidSave(
  processes: Map<string, { pid: number; status: AppStatus; startedAt: number }>
): void {
  if (pidSaveScheduled || !pidFilePath) return
  pidSaveScheduled = true
  process.nextTick(() => {
    pidSaveScheduled = false
    savePidRegistry(processes)
  })
}

export function cleanupOrphanedProcesses(): void {
  if (!pidFilePath) return
  try {
    if (!fs.existsSync(pidFilePath)) return
    const raw = fs.readFileSync(pidFilePath, 'utf-8')
    const data = JSON.parse(raw) as Record<string, { pid: number }>
    for (const [id, entry] of Object.entries(data)) {
      try {
        process.kill(entry.pid, 0) // throws if process doesn't exist
        try { process.kill(-entry.pid, 'SIGTERM') } catch {
          try { process.kill(entry.pid, 'SIGTERM') } catch { /* already dead */ }
        }
        console.log(`Cleaned up orphaned process ${id} (PID ${entry.pid})`)
      } catch { /* process not running */ }
    }
    fs.unlinkSync(pidFilePath)
  } catch { /* PID file missing or unparseable */ }
}
