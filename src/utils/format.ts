/** Format elapsed time since startedAt into a human-readable string (e.g. "2h 15m") */
export function formatUptime(startedAt?: number): string {
  if (!startedAt) return ''
  const seconds = Math.floor((Date.now() - startedAt) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

/** Return a Tailwind text color class for a log line based on its content */
export function getLineClass(line: string): string {
  if (line.startsWith('[stderr]')) return 'text-amber-400/80'
  if (line.startsWith('[') && line.includes(']') && (line.includes('Starting') || line.includes('Stopping') || line.includes('Stopped') || line.includes('Activated') || line.includes('Working'))) {
    return 'text-neutral-500'
  }
  if (line.includes('Error') || line.includes('error') || line.includes('ERROR')) return 'text-red-400'
  if (line.includes('WARNING') || line.includes('Warning')) return 'text-amber-400'
  return 'text-neutral-700 dark:text-neutral-300'
}
