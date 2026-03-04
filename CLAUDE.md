# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Launchpad — a macOS Electron menu bar app for launching, managing, and monitoring local development apps (Vite, Streamlit, FastAPI, Astro, etc.) from a single tray icon. Dark/light-themed, compact UI. Built with Electron 40 + React 19 + Vite 7 + Tailwind CSS v4.

## Commands

```bash
npm run dev          # Start dev server with HMR + Electron window
npm run build        # tsc -b && vite build (renderer → dist/, electron → dist-electron/)
npm run package      # Build + create macOS universal DMG via electron-builder
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode
```

Tests live in `electron/__tests__/` and run in a Node environment via `vitest.config.ts`.

## Architecture

Two Electron windows sharing one Vite bundle, with context isolation:

```
Tray App (BrowserWindow @ /#)       Console Window (BrowserWindow @ /#/console)
  ↕ window.electronAPI (contextBridge)
Preload (electron/preload.ts)
  ↕ ipcRenderer.invoke / ipcMain.handle
Main Process (electron/main.ts)
  ├── config-store.ts     — apps.json read/write/cache
  ├── ipc-handlers.ts     → ipc-app-handlers.ts + ipc-system-handlers.ts
  ├── process-manager.ts  — child process lifecycle
  ├── tray-menu.ts        — right-click tray context menu
  ├── pid-registry.ts     — PID file persistence
  └── project-scanner.ts  — auto-discover projects on disk
  ↕ child_process.spawn
Managed Apps (user's dev servers)
```

### Main Process (`electron/main.ts`)

- **Tray + Window**: Creates `Tray` with template PNG icon. Left-click toggles a frameless `BrowserWindow` (420×620) positioned directly below tray icon. Window hides on blur. Dock is hidden.
- **Console window**: A second `BrowserWindow` opened via `app:openConsole` IPC — larger dashboard with tabs. Shares the same Vite bundle, routed by `window.location.hash` (`#/console`).
- **Global shortcut**: `Cmd+Shift+L` toggles the tray window from anywhere.
- **Status broadcast**: `setInterval` every 1s pushes `status:update` to all windows.
- **Lifecycle**: `openAtLogin` enabled. `before-quit` calls `killAll()`.

### Config Store (`electron/config-store.ts`)

- Reads/writes `apps.json`. Caches in memory; call `invalidateCache()` after writes.
- **Atomic writes**: writes to `.tmp-{timestamp}`, then renames.
- **Backup**: copies current file to `.bak` before overwriting; falls back to `.bak` on parse error.
- Dev mode reads from project root; production copies bundled `apps.json` to `app.getPath('userData')` on first launch.

### IPC (`electron/ipc-handlers.ts`, `ipc-app-handlers.ts`, `ipc-system-handlers.ts`)

- `setupIPC()` in `ipc-handlers.ts` delegates to the two sub-modules.
- `startAppEntry()` / `stopAppEntry()` handle both single and grouped apps.
- `broadcastConfigChanged()` sends `config:changed` to all windows.

### Process Manager (`electron/process-manager.ts`)

- Central `Map<string, ManagedProcess>` keyed by app/component ID.
- **Spawning**: login shell (`spawn(SHELL, ['-lc', command])`) for full PATH (homebrew, pyenv, nvm). No `shell: true`.
- **Venv auto-detection**: checks `venv/bin`, `.venv/bin`, `env/bin` relative to app path.
- **Status state machine**: `stopped` → `starting` → `running` (first stdout/stderr) or `error`. 3s fallback promotes silent processes.
- **Termination**: SIGTERM → SIGKILL after 5s.
- **Logs**: buffers up to 500 lines per process. Timestamped system messages.
- **Metrics**: `getAppMetrics(id)` reads `/proc` or `ps` for CPU/mem.

### Renderer (`src/`)

`App.tsx` checks `window.location.hash` to render either `TrayApp` or `ConsoleApp`.

**Tray app** (`src/components/AppList.tsx` as root): Three views via `view` state: `'list'` | `'add'` | `'logs'`.

**Console app** (`src/ConsoleApp.tsx`): Tab-based dashboard with five tabs — Dashboard (metrics overview), Apps (sortable table), Logs (multi-app log viewer), Config (raw JSON editor), Settings.

**State management** (`src/hooks/useApps.ts`): Single `useApps()` hook. `apps[]` loaded once; `statuses{}` updated by `onStatusUpdate` listener. Also manages `toasts[]` and `pendingOps` set. `getAppStatus()` aggregates grouped app component statuses.

**Key components**:
- `AppList.tsx` — Tray main view. Search/filter, running/error counters, renders `AppCard` or `GroupedAppCard`. Footer with Add App. Uses `SortableAppList` for drag-and-drop reordering (`@dnd-kit`).
- `AppCard.tsx` — Single app row: StatusBadge, name, type pill, port, error. Hover-only remove button.
- `GroupedAppCard.tsx` — Expandable card for multi-service apps.
- `AppForm.tsx` — Add/edit form. Supports multi-service toggle via `ComponentServiceEditor`.
- `LogViewer.tsx` — Live log viewer, polls every 1s, smart auto-scroll, color-coded output.
- `ProjectScanner.tsx` / `ScanConfigurePhase.tsx` — Auto-discover projects from selected directories.
- `Icon.tsx` — Centralized SVG icon component (used everywhere via `<Icon name="..." />`).
- `Toast.tsx` / `ToastContainer` — Ephemeral notifications (3s auto-dismiss).
- `ThemeToggle.tsx` — Cycles dark/light/system theme. State persisted in `useTheme` hook.

### Types

**Shared** (`shared/types.ts`) — imported by both main and renderer:
```typescript
AppType = 'vite' | 'streamlit' | 'fastapi' | 'astro' | 'node' | 'django' | 'flask'
        | 'express' | 'nextjs' | 'nuxt' | 'remix' | 'svelte' | 'go' | 'rust' | 'ruby'
        | 'docker' | 'spring' | 'laravel' | 'other' | 'grouped'
AppStatus = 'stopped' | 'starting' | 'running' | 'error'
AppEntry { id, name, type, path?, command?, port?, components?, autoStart?, tags? }
AppComponent { id, name, path, command, type, port? }
StatusInfo { status, error?, pid?, startedAt?, port? }
IpcResult<T> { ok, data?, error? }
AppMetrics { cpu, mem, rss }
DiscoveredProject { id, name, path, type, command, port?, framework }
Toast { id, message, type, action?, progress? }
```

**Renderer-only** (`src/types.ts`) — re-exports shared types and adds `ElectronAPI` interface + `Window` global declaration.

### Type Registry (`src/typeRegistry.ts`)

Single source of truth for all app type metadata (label, Tailwind classes, category). Do not add `typeStyles` objects to individual components — use `getTypeClasses(type)` or `typeRegistry[type]` instead. Types are grouped into `Frontend | Backend | DevOps | Other` categories for form dropdowns.

## Data Store (`apps.json`)

Two entry shapes:
- **Single**: `{ id, name, type, path, command, port, autoStart?, tags? }`
- **Grouped**: `{ id, name, type: "grouped", components: [...], autoStart?, tags? }`

See `apps.example.json` for a reference template.

## TypeScript Setup

Project references: `tsconfig.json` → `tsconfig.app.json` (ES2022, `src/`) + `tsconfig.node.json` (ES2023, `electron/` + `vite.config.ts`).

Critical: `verbatimModuleSyntax: true` (use `import type` for type-only imports), `allowImportingTsExtensions: true`, `strict: true`. Both `src/` and `electron/` import from `shared/` using relative paths.

## Styling

Tailwind CSS v4 via `@import "tailwindcss"` — no `tailwind.config.js`. Supports dark/light/system via `useTheme` hook (adds `dark` class to `<html>`).

Shared CSS classes in `src/index.css`: `.btn-icon`, `.btn-action-start`, `.btn-action-stop`, `.btn-secondary`, `.input-field`. Custom 4px scrollbar styles.

## Build Output

- `dist/` — Vite-bundled React renderer
- `dist-electron/main.js` + `dist-electron/preload.js` — compiled Electron code
- `release/` — electron-builder DMG output
- Tray icon: `resources/trayIconTemplate.png` + `@2x.png` (macOS template images)

## Adding a New IPC Channel

1. Add handler in `electron/ipc-app-handlers.ts` or `ipc-system-handlers.ts` via `ipcMain.handle('channel:name', handler)`
2. Expose in `electron/preload.ts` via `ipcRenderer.invoke('channel:name')`
3. Add method signature to `ElectronAPI` interface in `src/types.ts`
4. Call via `window.electronAPI.methodName()` in renderer

## Adding a New App Type

1. Add to `AppType` union in `shared/types.ts`
2. Add entry in `typeRegistry` in `src/typeRegistry.ts` (label, classes, category)
3. That's it — forms and cards consume the registry automatically
