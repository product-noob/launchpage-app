import type { AppType } from '../types.ts'
import { groupedSelectableTypes } from '../typeRegistry.ts'
import { Icon } from './Icon.tsx'

export interface ComponentDraft {
  id: string
  name: string
  path: string
  command: string
  type: AppType
  port: string
}

interface ComponentServiceEditorProps {
  components: ComponentDraft[]
  errors: Record<string, string | undefined>
  isEdit: boolean
  parentId: string
  shouldShowError: (field: string) => boolean
  onUpdate: (index: number, field: keyof ComponentDraft, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onFolderSelect: (index: number) => void
  onTouch: (field: string) => void
}

export function ComponentServiceEditor({
  components, errors, shouldShowError,
  onUpdate, onAdd, onRemove, onFolderSelect, onTouch,
}: ComponentServiceEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Services</span>
        <button
          onClick={onAdd}
          className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
        >
          + Add service
        </button>
      </div>
      {components.map((comp, i) => (
        <div key={comp.id || i} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2.5 space-y-2 relative">
          {components.length > 1 && (
            <button
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 text-neutral-400 dark:text-neutral-600 hover:text-red-400 transition-colors"
              aria-label="Remove service"
            >
              <Icon name="close" className="w-3 h-3" />
            </button>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-neutral-500 block mb-0.5">Name</label>
              <input
                type="text"
                value={comp.name}
                onChange={e => onUpdate(i, 'name', e.target.value)}
                onBlur={() => onTouch(`comp-${i}-name`)}
                placeholder="Frontend"
                className={fieldClass(shouldShowError(`comp-${i}-name`) && errors[`comp-${i}-name`], 'text-[11px]')}
              />
              <FieldError error={shouldShowError(`comp-${i}-name`) ? errors[`comp-${i}-name`] : undefined} />
            </div>
            <div className="w-24">
              <label className="text-[9px] text-neutral-500 block mb-0.5">Type</label>
              <select
                value={comp.type}
                onChange={e => onUpdate(i, 'type', e.target.value)}
                className="input-field text-[11px]"
              >
                {groupedSelectableTypes.map(g => (
                  <optgroup key={g.category} label={g.category}>
                    {g.types.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 block mb-0.5">Path</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={comp.path}
                onChange={e => onUpdate(i, 'path', e.target.value)}
                onBlur={() => onTouch(`comp-${i}-path`)}
                placeholder="/path/to/service"
                className={fieldClass(shouldShowError(`comp-${i}-path`) && errors[`comp-${i}-path`], 'text-[11px] flex-1')}
              />
              <button onClick={() => onFolderSelect(i)} className="btn-secondary text-[10px] px-2 shrink-0">
                Browse
              </button>
            </div>
            <FieldError error={shouldShowError(`comp-${i}-path`) ? errors[`comp-${i}-path`] : undefined} />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 block mb-0.5">Command</label>
            <textarea
              value={comp.command}
              onChange={e => onUpdate(i, 'command', e.target.value)}
              onBlur={() => onTouch(`comp-${i}-command`)}
              placeholder={"npm run dev\nOne per line"}
              rows={2}
              className={fieldClass(shouldShowError(`comp-${i}-command`) && errors[`comp-${i}-command`], 'text-[11px] font-mono resize-none')}
            />
            <FieldError error={shouldShowError(`comp-${i}-command`) ? errors[`comp-${i}-command`] : undefined} />
          </div>
          <div className="w-20">
            <label className="text-[9px] text-neutral-500 block mb-0.5">Port</label>
            <input
              type="number"
              value={comp.port}
              onChange={e => onUpdate(i, 'port', e.target.value)}
              onBlur={() => onTouch(`comp-${i}-port`)}
              placeholder="3000"
              className={fieldClass(shouldShowError(`comp-${i}-port`) && errors[`comp-${i}-port`], 'text-[11px] font-mono')}
            />
            <FieldError error={shouldShowError(`comp-${i}-port`) ? errors[`comp-${i}-port`] : undefined} />
          </div>
        </div>
      ))}
    </div>
  )
}

function fieldClass(hasError: string | boolean | undefined, extra?: string): string {
  const base = 'input-field'
  const errorRing = hasError ? 'border-red-500/60 dark:border-red-500/60' : ''
  return [base, errorRing, extra].filter(Boolean).join(' ')
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[9px] text-red-400 mt-0.5">{error}</p>
}
