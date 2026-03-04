import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'
import type { ThemeMode } from '../hooks/useTheme.ts'

interface ThemeToggleProps {
  mode: ThemeMode
  onCycle: () => void
  noDrag?: boolean
}

const modeConfig: Record<ThemeMode, { icon: IconName; title: string }> = {
  dark: { icon: 'moon', title: 'Theme: Dark -click for Light' },
  light: { icon: 'sun', title: 'Theme: Light -click for System' },
  system: { icon: 'monitor', title: 'Theme: System -click for Dark' },
}

export function ThemeToggle({ mode, onCycle, noDrag }: ThemeToggleProps) {
  const { icon, title } = modeConfig[mode]
  return (
    <button
      onClick={onCycle}
      className="btn-icon text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
      style={noDrag ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      title={title}
      aria-label="Cycle theme"
    >
      <Icon name={icon} />
    </button>
  )
}
