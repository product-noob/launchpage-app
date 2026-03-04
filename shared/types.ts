export type AppType =
  | 'vite' | 'streamlit' | 'fastapi' | 'astro' | 'node'
  | 'django' | 'flask' | 'express' | 'nextjs' | 'nuxt' | 'remix' | 'svelte'
  | 'go' | 'rust' | 'ruby' | 'docker' | 'spring' | 'laravel'
  | 'other' | 'grouped'

export type AppStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface AppComponent {
  id: string
  name: string
  path: string
  command: string
  type: AppType
  port?: number
}

export interface AppEntry {
  id: string
  name: string
  type: AppType
  path?: string
  command?: string
  port?: number
  components?: AppComponent[]
  autoStart?: boolean
  tags?: string[]
}

export interface AppsData {
  apps: AppEntry[]
}

export interface StatusInfo {
  status: AppStatus
  error?: string
  pid?: number
  startedAt?: number
  port?: number
}

export interface IpcResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface AppMetrics {
  cpu: string
  mem: string
  rss: string
}

export interface DiscoveredProject {
  id: string
  name: string
  path: string
  type: AppType
  command: string
  port?: number
  framework: string
}

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
  progress?: number
}
