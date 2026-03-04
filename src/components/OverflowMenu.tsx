import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '../hooks/useClickOutside.ts'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'
import { menuItemColors } from '../tokens.ts'

export interface MenuAction {
  icon: IconName
  label: string
  onClick: () => void
  danger?: boolean
  /** Hide this item when false/undefined */
  visible?: boolean
}

interface OverflowMenuProps {
  items: MenuAction[]
  /** Width class for the dropdown — defaults to 'w-40' */
  width?: string
}

export function OverflowMenu({ items, width = 'w-40' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, open, useCallback(() => setOpen(false), []))

  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const visible = items.filter(i => i.visible !== false)
  if (visible.length === 0) return null

  const hasDanger = visible.some(i => i.danger)
  const normalItems = visible.filter(i => !i.danger)
  const dangerItems = visible.filter(i => i.danger)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        title="More actions"
        aria-label="More actions"
      >
        <Icon name="dots-vertical" />
      </button>
      {open && (
        <div className={`absolute right-0 top-7 z-50 ${width} rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg py-1 text-[11px]`}>
          {normalItems.map(item => (
            <button
              key={item.label}
              onClick={() => act(item.onClick)}
              className={`w-full px-3 py-1.5 flex items-center gap-2 transition-colors ${menuItemColors.normal}`}
            >
              <Icon name={item.icon} className="w-3.5 h-3.5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
          {hasDanger && normalItems.length > 0 && (
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
          )}
          {dangerItems.map(item => (
            <button
              key={item.label}
              onClick={() => act(item.onClick)}
              className={`w-full px-3 py-1.5 flex items-center gap-2 transition-colors ${menuItemColors.danger}`}
            >
              <Icon name={item.icon} className="w-3.5 h-3.5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
