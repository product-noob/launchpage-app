import { useState, useEffect } from 'react'

export function ConfigTab() {
  const [config, setConfig] = useState('')
  const [savedConfig, setSavedConfig] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (!window.electronAPI.onConfigChanged) return
    const unsub = window.electronAPI.onConfigChanged(() => { loadConfig() })
    return unsub
  }, [])

  const loadConfig = async () => {
    const result = await window.electronAPI.readRawConfig()
    if (result.ok && result.data) {
      // Pretty-print the JSON
      try {
        const formatted = JSON.stringify(JSON.parse(result.data), null, 2)
        setConfig(formatted)
        setSavedConfig(formatted)
      } catch {
        setConfig(result.data)
        setSavedConfig(result.data)
      }
    }
  }

  const handleSave = async () => {
    setError('')
    setSaved(false)

    // Validate JSON
    try {
      const parsed = JSON.parse(config)
      if (!parsed || !Array.isArray(parsed.apps)) {
        setError('Invalid config: JSON must contain an "apps" array')
        return
      }
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    const result = await window.electronAPI.writeRawConfig(config)
    if (result.ok) {
      setSavedConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(result.error || 'Failed to save')
    }
  }

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(config), null, 2)
      setConfig(formatted)
      setError('')
    } catch (e) {
      setError(`Cannot format: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const hasChanges = config !== savedConfig

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">apps.json</h2>
        <div className="flex-1" />
        {hasChanges && (
          <span className="text-[10px] text-amber-500 font-medium">Unsaved changes</span>
        )}
        <button
          onClick={handleFormat}
          className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          Format
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="text-[11px] px-3 py-1 rounded-md bg-sky-500 text-white hover:bg-sky-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 px-6 py-3 min-h-0">
        <textarea
          value={config}
          onChange={e => { setConfig(e.target.value); setError('') }}
          className="w-full h-full font-mono text-[12px] leading-relaxed p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 resize-none outline-none focus:border-sky-500/50"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
