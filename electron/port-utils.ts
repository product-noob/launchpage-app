import net from 'node:net'
import { execSync } from 'node:child_process'

const MAX_PORT_SCAN_RANGE = 50
const PORT_PROBE_TIMEOUT_MS = 1000
const LSOF_TIMEOUT_MS = 2000

/** Check if a port is already in use */
export async function checkPort(port: number): Promise<boolean> {
  // Primary: lsof is the most reliable on macOS — detects any binding on the port
  try {
    execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf-8', timeout: LSOF_TIMEOUT_MS })
    return true // lsof found a listener
  } catch { /* no listener found or lsof failed — fall through */ }

  // Fallback: try binding on both specific and wildcard addresses
  for (const host of ['127.0.0.1', '0.0.0.0'] as const) {
    const inUse = await new Promise<boolean>((resolve) => {
      const server = net.createServer()
      server.once('error', () => resolve(true))
      server.once('listening', () => { server.close(); resolve(false) })
      server.listen(port, host)
    })
    if (inUse) return true
  }

  return false
}

/** Find the next free port starting from startPort */
export async function findFreePort(startPort: number): Promise<number> {
  let port = startPort
  while (port < startPort + MAX_PORT_SCAN_RANGE) {
    const inUse = await checkPort(port)
    if (!inUse) return port
    port++
  }
  return port // give up and return the last one tried
}

/** TCP health check on port */
export function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(PORT_PROBE_TIMEOUT_MS)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
    socket.connect(port, '127.0.0.1')
  })
}

/**
 * Map of framework type → the port flag to use.
 */
export const portFlagForType: Record<string, (port: number) => string> = {
  vite:      (p) => `--port ${p}`,
  astro:     (p) => `--port ${p}`,
  nextjs:    (p) => `-p ${p}`,
  nuxt:      (p) => `--port ${p}`,
  remix:     (p) => `--port ${p}`,
  svelte:    (p) => `--port ${p}`,
  flask:     (p) => `--port ${p}`,
  laravel:   (p) => `--port ${p}`,
  express:   (p) => `--port ${p}`,
  fastapi:   (p) => `--port ${p}`,
  django:    (p) => `--port ${p}`,
  streamlit: (p) => `--server.port ${p}`,
  spring:    (p) => `--server.port=${p}`,
}

/**
 * Check if the command already contains an explicit port flag so we don't double-inject.
 */
export function commandHasPortFlag(cmd: string): boolean {
  return /--port\b|--server\.port\b|-p\s+\d/.test(cmd)
}

/**
 * Try to detect the port flag from the command content itself, regardless of the
 * declared app type.
 */
export function detectPortFlagFromCommand(cmd: string): ((port: number) => string) | null {
  if (/\buvicorn\b/.test(cmd)) return (p) => `--port ${p}`
  if (/\bstreamlit\b/.test(cmd)) return (p) => `--server.port ${p}`
  if (/\bflask\b/.test(cmd)) return (p) => `--port ${p}`
  if (/\bgunicorn\b/.test(cmd)) return (p) => `-b 127.0.0.1:${p}`
  if (/\badk\s+web\b/.test(cmd)) return (p) => `--port ${p}`
  return null
}

/**
 * Inject a port flag into a command line, handling npm/yarn/pnpm wrappers.
 */
export function injectPortFlag(cmdLine: string, flag: string): string {
  const isPackageManager = /^(npm\s+run|npx|yarn|pnpm)\b/.test(cmdLine.trim())
  if (isPackageManager) {
    if (/\s--\s/.test(cmdLine)) {
      return `${cmdLine} ${flag}`
    }
    return `${cmdLine} -- ${flag}`
  }
  return `${cmdLine} ${flag}`
}
