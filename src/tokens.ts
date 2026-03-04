import type { AppStatus } from './types.ts'

export const statusColors: Record<AppStatus, {
  dot: string
  dotPulse: boolean
  cardBorder: string
  text: string
  bg: string
}> = {
  stopped: {
    dot: 'bg-neutral-500',
    dotPulse: false,
    cardBorder: 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700',
    text: 'text-neutral-400 dark:text-neutral-500',
    bg: 'bg-neutral-100 dark:bg-neutral-800/50',
  },
  starting: {
    dot: 'bg-amber-400',
    dotPulse: true,
    cardBorder: 'border-emerald-500/20 bg-emerald-500/5',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  running: {
    dot: 'bg-emerald-400',
    dotPulse: false,
    cardBorder: 'border-emerald-500/20 bg-emerald-500/5',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  error: {
    dot: 'bg-red-500',
    dotPulse: false,
    cardBorder: 'border-red-500/30 bg-red-500/5',
    text: 'text-red-500',
    bg: 'bg-red-500/10',
  },
}

export const toastStyles: Record<string, string> = {
  success: 'bg-emerald-900/90 text-emerald-200 border-emerald-700/50',
  error: 'bg-red-900/90 text-red-200 border-red-700/50',
  info: 'bg-neutral-200/90 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 border-neutral-300/50 dark:border-neutral-700/50',
}

export const menuItemColors = {
  normal: 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
  danger: 'text-red-400 hover:bg-red-500/10',
} as const
