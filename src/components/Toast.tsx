import type { Toast as ToastType } from '../types.ts'
import { toastStyles } from '../tokens.ts'
import { Icon } from './Icon.tsx'

const iconMap: Record<ToastType['type'], 'check-circle' | 'error-circle' | 'info-circle'> = {
  success: 'check-circle',
  error: 'error-circle',
  info: 'info-circle',
}

interface ToastContainerProps {
  toasts: ToastType[]
  onDismiss: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="absolute bottom-12 left-3 right-3 flex flex-col gap-1.5 z-50 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] shadow-lg pointer-events-auto animate-[slideUp_0.2s_ease-out] ${toastStyles[toast.type]}`}
          onClick={() => !toast.action && onDismiss(toast.id)}
        >
          <Icon name={iconMap[toast.type]} className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 truncate">{toast.message}</span>
          {toast.action && (
            <button
              onClick={(e) => { e.stopPropagation(); toast.action!.onClick() }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 transition-colors shrink-0"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
