import { useEffect, useRef, useCallback } from 'react'

interface ConfirmDialogProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, confirmLabel = 'Remove', onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
      return
    }
    if (e.key === 'Tab') {
      const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [onCancel])

  useEffect(() => {
    cancelRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmation"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 mx-4 max-w-[300px] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-3">{message}</p>
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 text-[11px] py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 text-[11px] py-1.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
