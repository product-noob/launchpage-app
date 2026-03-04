import { useState, useEffect, useCallback, useRef } from 'react'

interface KeyboardNavOptions {
  itemCount: number
  onSelect?: (index: number) => void
  onEscape?: () => void
  onCmdK?: () => void
  enabled?: boolean
}

/**
 * Keyboard navigation for the tray app list.
 * - Arrow Up/Down to move focus through items
 * - Enter to select focused item
 * - Escape to go back / clear
 * - Cmd+K (or Ctrl+K) to focus search
 */
export function useKeyboardNav({ itemCount, onSelect, onEscape, onCmdK, enabled = true }: KeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const resetFocus = useCallback(() => setFocusedIndex(-1), [])

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === 'k') {
        e.preventDefault()
        onCmdK?.()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (focusedIndex >= 0) {
          setFocusedIndex(-1)
        } else {
          onEscape?.()
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => (prev < itemCount - 1 ? prev + 1 : 0))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : itemCount - 1))
        return
      }

      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        onSelect?.(focusedIndex)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, itemCount, focusedIndex, onSelect, onEscape, onCmdK])

  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-app-card]')
    items[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  return { focusedIndex, setFocusedIndex, resetFocus, listRef }
}
