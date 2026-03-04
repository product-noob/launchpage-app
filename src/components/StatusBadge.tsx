import type { AppStatus } from '../types.ts'
import { statusColors } from '../tokens.ts'

export function StatusBadge({ status }: { status: AppStatus }) {
  const { dot, dotPulse } = statusColors[status]
  return (
    <span className="relative flex h-2 w-2">
      {dotPulse && (
        <span className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-75 animate-ping`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
    </span>
  )
}
