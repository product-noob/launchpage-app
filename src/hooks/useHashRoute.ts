import { useState, useEffect, useCallback } from 'react'

/**
 * Minimal hash-based router for the console window.
 * Parses the fragment after a base prefix and syncs with browser history.
 */
export function useHashRoute<T extends string>(validRoutes: readonly T[], defaultRoute: T, prefix = '#/console'): {
  route: T
  setRoute: (r: T) => void
} {
  const parseRoute = useCallback((): T => {
    const hash = window.location.hash
    if (!hash.startsWith(prefix)) return defaultRoute
    const segment = hash.slice(prefix.length).replace(/^\//, '') as T
    return validRoutes.includes(segment) ? segment : defaultRoute
  }, [validRoutes, defaultRoute, prefix])

  const [route, setRouteState] = useState<T>(parseRoute)

  useEffect(() => {
    const onHashChange = () => setRouteState(parseRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [parseRoute])

  const setRoute = useCallback((r: T) => {
    const newHash = `${prefix}/${r}`
    if (window.location.hash !== newHash) {
      window.location.hash = newHash
    }
    setRouteState(r)
  }, [prefix])

  return { route, setRoute }
}
