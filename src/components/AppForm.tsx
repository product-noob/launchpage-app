import { useState, useCallback } from 'react'
import type { AppEntry, AppType, AppComponent } from '../types.ts'
import { groupedSelectableTypes } from '../typeRegistry.ts'
import { Icon } from './Icon.tsx'
import { ComponentServiceEditor } from './ComponentServiceEditor.tsx'
import type { ComponentDraft } from './ComponentServiceEditor.tsx'

function emptyComponent(): ComponentDraft {
  return { id: '', name: '', path: '', command: '', type: 'other', port: '' }
}

interface AddMode {
  mode: 'add'
  onSubmit: (app: AppEntry) => void
  onCancel: () => void
}

interface EditMode {
  mode: 'edit'
  app: AppEntry
  onSubmit: (updates: Partial<AppEntry>) => void
  onCancel: () => void
}

type AppFormProps = AddMode | EditMode

const MIN_PORT = 1
const MAX_PORT = 65535

function componentToDraft(c: AppComponent): ComponentDraft {
  return { id: c.id, name: c.name, path: c.path, command: c.command, type: c.type, port: c.port?.toString() || '' }
}

function validatePort(value: string): string | undefined {
  if (!value) return undefined
  const n = parseInt(value, 10)
  if (isNaN(n) || n < MIN_PORT || n > MAX_PORT) return `Port must be ${MIN_PORT}–${MAX_PORT}`
  return undefined
}

type FieldErrors = Record<string, string | undefined>

export function AppForm(props: AppFormProps) {
  const isEdit = props.mode === 'edit'
  const initial = isEdit ? props.app : undefined

  const [name, setName] = useState(initial?.name || '')
  const [isGrouped, setIsGrouped] = useState(initial?.type === 'grouped')

  const [appPath, setAppPath] = useState(initial?.path || '')
  const [command, setCommand] = useState(initial?.command || '')
  const [type, setType] = useState<AppType>(initial?.type || 'other')
  const [port, setPort] = useState(initial?.port?.toString() || '')

  const [components, setComponents] = useState<ComponentDraft[]>(
    initial?.components?.map(componentToDraft) || [emptyComponent()]
  )

  const [autoStart, setAutoStart] = useState(initial?.autoStart || false)
  const [tags, setTags] = useState((initial?.tags || []).join(', '))

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const touch = useCallback((field: string) => {
    setTouched(prev => prev[field] ? prev : { ...prev, [field]: true })
  }, [])

  const shouldShowError = useCallback((field: string) => submitted || touched[field], [submitted, touched])

  const getErrors = useCallback((): FieldErrors => {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Name is required'

    if (isGrouped) {
      components.forEach((c, i) => {
        if (!c.name.trim()) errors[`comp-${i}-name`] = 'Required'
        if (!c.path.trim()) errors[`comp-${i}-path`] = 'Required'
        if (!c.command.trim()) errors[`comp-${i}-command`] = 'Required'
        const portErr = validatePort(c.port)
        if (portErr) errors[`comp-${i}-port`] = portErr
      })
    } else {
      if (!appPath.trim()) errors.path = 'Path is required'
      if (!command.trim()) errors.command = 'Command is required'
      const portErr = validatePort(port)
      if (portErr) errors.port = portErr
    }

    return errors
  }, [name, isGrouped, appPath, command, port, components])

  const errors = getErrors()
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) setAppPath(folder)
  }

  const handleComponentFolderSelect = async (index: number) => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      setComponents(prev => prev.map((c, i) => i === index ? { ...c, path: folder } : c))
    }
  }

  const updateComponent = (index: number, field: keyof ComponentDraft, value: string) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const addComponent = () => {
    if (isEdit && initial) {
      const newId = `${initial.id}-service-${Date.now()}`
      setComponents(prev => [...prev, { ...emptyComponent(), id: newId }])
    } else {
      setComponents(prev => [...prev, emptyComponent()])
    }
  }

  const removeComponent = (index: number) => {
    if (components.length <= 1) return
    setComponents(prev => prev.filter((_, i) => i !== index))
  }

  const appId = isEdit
    ? initial!.id
    : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSubmit = () => {
    setSubmitted(true)
    if (hasErrors) return

    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)

    if (isGrouped) {
      const builtComponents: AppComponent[] = components.map(c => ({
        id: c.id || `${appId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        name: c.name.trim(),
        path: c.path.trim(),
        command: c.command.trim(),
        type: c.type,
        port: c.port ? parseInt(c.port, 10) : undefined,
      }))

      if (isEdit) {
        props.onSubmit({ name: name.trim(), autoStart, tags: parsedTags, components: builtComponents })
      } else {
        props.onSubmit({ id: appId, name: name.trim(), type: 'grouped', components: builtComponents, autoStart, tags: parsedTags })
      }
    } else {
      const common = {
        name: name.trim(), type, path: appPath.trim(), command: command.trim(),
        port: port ? parseInt(port, 10) : undefined, autoStart, tags: parsedTags,
      }
      if (isEdit) {
        props.onSubmit(common)
      } else {
        props.onSubmit({ id: appId, ...common })
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <button onClick={props.onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label="Back">
          <Icon name="chevron-left" className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          {isEdit ? 'Edit App' : 'Add New App'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <Field label="Name" error={shouldShowError('name') ? errors.name : undefined}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => touch('name')}
            placeholder="My App"
            className={fieldClass(shouldShowError('name') && errors.name)}
            autoFocus
          />
        </Field>

        {!isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isGrouped}
              onChange={e => setIsGrouped(e.target.checked)}
              className="rounded border-neutral-400 dark:border-neutral-600 bg-neutral-200 dark:bg-neutral-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Multi-service app</span>
            <span className="text-[9px] text-neutral-400 dark:text-neutral-600">(e.g. frontend + backend)</span>
          </label>
        )}

        {isGrouped ? (
          <ComponentServiceEditor
            components={components}
            errors={errors}
            isEdit={isEdit}
            parentId={appId}
            shouldShowError={shouldShowError}
            onUpdate={updateComponent}
            onAdd={addComponent}
            onRemove={removeComponent}
            onFolderSelect={handleComponentFolderSelect}
            onTouch={touch}
          />
        ) : (
          <>
            <Field label="Path" error={shouldShowError('path') ? errors.path : undefined}>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={appPath}
                  onChange={e => setAppPath(e.target.value)}
                  onBlur={() => touch('path')}
                  placeholder="/path/to/project"
                  className={fieldClass(shouldShowError('path') && errors.path, 'flex-1')}
                />
                <button onClick={handleSelectFolder} className="btn-secondary text-[11px] px-2.5 shrink-0">
                  Browse
                </button>
              </div>
            </Field>

            <Field label="Command" error={shouldShowError('command') ? errors.command : undefined}>
              <textarea
                value={command}
                onChange={e => setCommand(e.target.value)}
                onBlur={() => touch('command')}
                placeholder={"npm run dev\n\nOne command per line"}
                rows={2}
                className={fieldClass(shouldShowError('command') && errors.command, 'font-mono text-[11px] resize-none')}
              />
              <span className="text-[9px] text-neutral-500 dark:text-neutral-600 mt-0.5 block">One command per line -runs sequentially</span>
            </Field>

            <div className="flex gap-2">
              <Field label="Type" className="flex-1">
                <select value={type} onChange={e => setType(e.target.value as AppType)} className="input-field">
                  {groupedSelectableTypes.map(g => (
                    <optgroup key={g.category} label={g.category}>
                      {g.types.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Port" className="w-24" error={shouldShowError('port') ? errors.port : undefined}>
                <input
                  type="number"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  onBlur={() => touch('port')}
                  placeholder="3000"
                  className={fieldClass(shouldShowError('port') && errors.port, 'font-mono')}
                />
              </Field>
            </div>
          </>
        )}

        <Field label="Tags">
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="frontend, python, demo"
            className="input-field"
          />
          <span className="text-[9px] text-neutral-500 dark:text-neutral-600 mt-0.5 block">Comma-separated</span>
        </Field>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoStart}
            onChange={e => setAutoStart(e.target.checked)}
            className="rounded border-neutral-400 dark:border-neutral-600 bg-neutral-200 dark:bg-neutral-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
          />
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Auto-start on launch</span>
        </label>
      </div>

      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <button onClick={props.onCancel} className="btn-secondary flex-1 py-1.5">Cancel</button>
        <button
          onClick={handleSubmit}
          className="flex-1 text-[12px] font-medium py-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isEdit ? 'Save Changes' : 'Add App'}
        </button>
      </div>
    </div>
  )
}

function fieldClass(hasError: string | boolean | undefined, extra?: string): string {
  const base = 'input-field'
  const errorRing = hasError ? 'border-red-500/60 dark:border-red-500/60' : ''
  return [base, errorRing, extra].filter(Boolean).join(' ')
}

function Field({ label, className, error, children }: { label: string; className?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">{label}</label>
      {children}
      <FieldError error={error} />
    </div>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[9px] text-red-400 mt-0.5">{error}</p>
}
