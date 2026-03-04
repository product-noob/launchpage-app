import { Icon } from './Icon.tsx'

interface CheckboxIconProps {
  checked: boolean
  indeterminate?: boolean
}

export function CheckboxIcon({ checked, indeterminate }: CheckboxIconProps) {
  if (indeterminate) {
    return (
      <div className="w-3.5 h-3.5 rounded border border-sky-500 bg-sky-500 flex items-center justify-center shrink-0">
        <Icon name="minus" className="w-2.5 h-2.5 text-white" />
      </div>
    )
  }
  if (checked) {
    return (
      <div className="w-3.5 h-3.5 rounded border border-sky-500 bg-sky-500 flex items-center justify-center shrink-0">
        <Icon name="check" className="w-2.5 h-2.5 text-white" />
      </div>
    )
  }
  return (
    <div className="w-3.5 h-3.5 rounded border border-neutral-400 dark:border-neutral-600 shrink-0" />
  )
}

function DirCheckbox({ path, fullPath, checked, onToggle }: { path: string; fullPath: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
      title={fullPath}
    >
      <CheckboxIcon checked={checked} />
      <Icon name="folder-scan" className="w-3.5 h-3.5 text-neutral-400" />
      <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate">{path}</span>
    </button>
  )
}

interface ConfigurePhaseProps {
  defaultDirs: string[]
  customDirs: string[]
  selectedDirs: Set<string>
  error: string | null
  onToggleDir: (dir: string) => void
  onAddCustom: () => void
  onRemoveCustom: (dir: string) => void
}

export function ScanConfigurePhase({
  defaultDirs, customDirs, selectedDirs, error,
  onToggleDir, onAddCustom, onRemoveCustom,
}: ConfigurePhaseProps) {
  const shortenPath = (p: string) =>
    p.replace(/^\/(?:Users|home)\/[^/]+/, '~')
     .replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')

  return (
    <div className="px-3 py-3 space-y-3">
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        Select folders to scan for dev projects. The scanner looks for
        package.json, pyproject.toml, Cargo.toml, go.mod, and more.
      </p>

      {error && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2.5 py-1.5">
          {error}
        </div>
      )}

      {defaultDirs.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block">Detected folders</span>
          {defaultDirs.map(dir => (
            <DirCheckbox
              key={dir}
              path={shortenPath(dir)}
              fullPath={dir}
              checked={selectedDirs.has(dir)}
              onToggle={() => onToggleDir(dir)}
            />
          ))}
        </div>
      )}

      {defaultDirs.length === 0 && (
        <div className="text-[11px] text-neutral-500 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-800/50 rounded-md px-2.5 py-2">
          No common project folders found (~/Developer, ~/Projects, ~/Code, etc.)
        </div>
      )}

      {customDirs.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block">Custom folders</span>
          {customDirs.map(dir => (
            <div key={dir} className="flex items-center gap-1">
              <div className="flex-1">
                <DirCheckbox
                  path={shortenPath(dir)}
                  fullPath={dir}
                  checked={selectedDirs.has(dir)}
                  onToggle={() => onToggleDir(dir)}
                />
              </div>
              <button
                onClick={() => onRemoveCustom(dir)}
                className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                aria-label="Remove folder"
              >
                <Icon name="close" className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddCustom}
        className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
      >
        <Icon name="folder-scan" className="w-3.5 h-3.5" />
        Browse for folder...
      </button>
    </div>
  )
}
