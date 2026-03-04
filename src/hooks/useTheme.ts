import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'launchpad-theme'

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage unavailable */ }
  return 'dark'
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)
  const [resolved, setResolved] = useState<'dark' | 'light'>(() => resolveTheme(getInitialMode()))

  useEffect(() => {
    const r = resolveTheme(mode)
    setResolved(r)
    applyTheme(r)
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* noop */ }
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = resolveTheme('system')
      setResolved(r)
      applyTheme(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  const cycleTheme = useCallback(() => {
    setModeState(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark')
  }, [])

  return { mode, resolved, isDark: resolved === 'dark', setMode, cycleTheme }
}
