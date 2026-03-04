import { spawn, execSync, execFile } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const isWindows = process.platform === 'win32'

export function spawnProcess(
  command: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
): ChildProcess {
  if (isWindows) {
    return spawn('cmd.exe', ['/c', command], {
      cwd, env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })
  }
  const userShell = process.env.SHELL || '/bin/zsh'
  return spawn(userShell, ['-lc', command], {
    cwd, env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
}

export function killProcessTree(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): void {
  if (isWindows) {
    try {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' })
    } catch { /* already dead */ }
    return
  }
  // macOS / Linux: kill the process group, fall back to pgrep
  try {
    process.kill(-pid, signal)
  } catch {
    try {
      const children = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8' }).trim().split('\n')
      for (const childPid of children) {
        if (childPid) {
          try { process.kill(parseInt(childPid, 10), signal) } catch { /* already dead */ }
        }
      }
    } catch { /* no children or pgrep failed */ }
    try { process.kill(pid, signal) } catch { /* already dead */ }
  }
}

export function detectVenv(appPath: string): string | null {
  const subdirs = isWindows ? ['Scripts'] : ['bin']
  const venvNames = ['venv', '.venv', 'env']
  for (const name of venvNames) {
    for (const sub of subdirs) {
      const candidate = path.join(appPath, name, sub)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
}

export function openTerminal(dirPath: string): void {
  if (isWindows) {
    // Try Windows Terminal first, fall back to cmd.exe
    try {
      spawn('wt.exe', ['-d', dirPath], { detached: true, stdio: 'ignore' }).unref()
    } catch {
      spawn('cmd.exe', ['/K', `cd /d "${dirPath}"`], { detached: true, stdio: 'ignore' }).unref()
    }
    return
  }
  spawn('open', ['-a', 'Terminal', dirPath], { detached: true, stdio: 'ignore' }).unref()
}

export function getProcessMetrics(pid: number): Promise<{ cpu: string; mem: string; rss: string }> {
  const empty = { cpu: '-', mem: '-', rss: '-' }

  if (isWindows) {
    return new Promise(resolve => {
      const ps = `Get-Process -Id ${pid} | Select-Object -Property CPU,WorkingSet64 | ConvertTo-Json`
      execFile('powershell.exe', ['-NonInteractive', '-Command', ps], (err, stdout) => {
        if (err) { resolve(empty); return }
        try {
          const data = JSON.parse(stdout.trim())
          const cpuSec = typeof data.CPU === 'number' ? data.CPU.toFixed(1) + 's' : '-'
          const wsMB = typeof data.WorkingSet64 === 'number'
            ? Math.round(data.WorkingSet64 / 1024 / 1024) + 'MB'
            : '-'
          resolve({ cpu: cpuSec, mem: '-', rss: wsMB })
        } catch { resolve(empty) }
      })
    })
  }

  return new Promise(resolve => {
    execFile('ps', ['-p', String(pid), '-o', '%cpu,%mem,rss'], (err, stdout) => {
      if (err) { resolve(empty); return }
      const lines = stdout.trim().split('\n')
      if (lines.length < 2) { resolve(empty); return }
      const parts = lines[1].trim().split(/\s+/)
      resolve({
        cpu: (parts[0] || '-') + '%',
        mem: (parts[1] || '-') + '%',
        rss: parts[2] ? `${Math.round(parseInt(parts[2]) / 1024)}MB` : '-',
      })
    })
  })
}
