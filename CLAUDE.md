# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Launchpad -a cross-platform (macOS + Windows) Electron tray app for launching, managing, and monitoring local development apps (Vite, Streamlit, FastAPI, Astro, Next.js, etc.) from a single system tray icon. Dark/light-themed, compact UI. Built with Electron 40 + React 19 + Vite 7 + Tailwind CSS v4.

**Website**: [launchpad.princejain.me](https://launchpad.princejain.me) -React SPA landing page in `launchpad-website/`.

## Commands

```bash
npm run dev          # Start dev server with HMR + Electron window
npm run build        # tsc -b && vite build (renderer → dist/, electron → dist-electron/)
npm run package      # Build + create macOS DMG via electron-builder
npm run package:win  # Build + create Windows NSIS installer
npm run package:all  # Build both macOS + Windows
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode
```

Tests live in `electron/__tests__/` and run in a Node environment via `vitest.config.ts`.

## Distribution

- **macOS**: DMG via `electron-builder --mac`. Also available via Homebrew: `brew install --cask princejain/tap/launchpad` (tap formula in `homebrew-tap/Casks/launchpad.rb`).
- **Windows**: NSIS installer via `electron-builder --win`. Also available via `winget install PrinceJain.Launchpad`.
- **Install scripts**: `install.sh` (macOS, downloads DMG from GitHub Releases) and `install.ps1` (Windows, downloads EXE).
- **GitHub Releases**: CI builds and uploads both DMG and EXE on version tags (`v*`).

## Architecture

Two Electron windows sharing one Vite bundle, with context isolation:

```
Tray App (BrowserWindow @ /#)       Console Window (BrowserWindow @ /#/console)
  ↕ window.electronAPI (contextBridge)
Preload (electron/preload.ts)
  ↕ ipcRenderer.invoke / ipcMain.handle
Main Process (electron/main.ts)
  ├── config-store.ts     -apps.json read/write/cache
  ├── ipc-handlers.ts     → ipc-app-handlers.ts + ipc-system-handlers.ts
  ├── process-manager.ts  -child process lifecycle
  ├── platform.ts         -cross-platform abstractions (spawn, kill, venv, terminal, metrics)
  ├── port-utils.ts       -port checking, free port finding, port flag injection
  ├── tray-menu.ts        -right-click tray context menu
  ├── pid-registry.ts     -PID file persistence
  └── project-scanner.ts  -auto-discover projects on disk
  ↕ child_process.spawn
Managed Apps (user's dev servers)
```

### Cross-Platform Layer (`electron/platform.ts`)

All OS-specific behavior is centralized here:
- **Spawning**: macOS/Linux uses login shell (`spawn(SHELL, ['-lc', cmd])`); Windows uses `cmd.exe /c`.
- **Process killing**: macOS/Linux uses process groups (`kill(-pid)`) with `pgrep` fallback; Windows uses `taskkill /F /T /PID`.
- **Venv detection**: looks for `Scripts/` on Windows, `bin/` on Unix in `venv/`, `.venv/`, `env/`.
- **Terminal opening**: macOS uses Terminal.app; Windows uses Windows Terminal (`wt.exe`) with `cmd.exe` fallback.
- **Process metrics**: macOS uses `ps`; Windows uses PowerShell `Get-Process`.

### Main Process (`electron/main.ts`)

- **Tray + Window**: Creates `Tray` with icon. Left-click toggles a frameless `BrowserWindow` (420×620). On macOS: positioned below tray, vibrancy `'menu'`, dock hidden. On Windows: positioned above tray, opaque background.
- **Console window**: A second `BrowserWindow` opened via `app:openConsole` IPC -larger dashboard with tabs. Pre-created hidden on startup for instant opening. On macOS, dock is shown/hidden with console window.
- **Single instance**: Uses `app.requestSingleInstanceLock()`. Second instance toggles the existing window.
- **Global shortcut**: `CommandOrControl+Shift+L` toggles the tray window from anywhere.
- **Status broadcast**: `setInterval` every 1s pushes `status:update` to all windows.
- **Lifecycle**: `openAtLogin` enabled. `before-quit` calls `killAll()`.

### Config Store (`electron/config-store.ts`)

- Reads/writes `apps.json`. Caches in memory; call `invalidateCache()` after writes.
- **Atomic writes**: writes to `.tmp-{timestamp}`, then renames.
- **Backup**: copies current file to `.bak` before overwriting; falls back to `.bak` on parse error.
- **Import/Export**: IPC handlers for backup/restore of `apps.json` via file dialogs.
- Dev mode reads from project root; production copies bundled `apps.json` to `app.getPath('userData')` on first launch.

### IPC (`electron/ipc-handlers.ts`, `ipc-app-handlers.ts`, `ipc-system-handlers.ts`)

- `setupIPC()` in `ipc-handlers.ts` delegates to the two sub-modules.
- `startAppEntry()` / `stopAppEntry()` handle both single and grouped apps.
- `broadcastConfigChanged()` sends `config:changed` to all windows.

### Process Manager (`electron/process-manager.ts`)

- Central `Map<string, ManagedProcess>` keyed by app/component ID.
- **Spawning**: Delegates to `platform.ts` for OS-specific shell invocation.
- **Venv auto-detection**: Delegates to `platform.ts` for OS-specific venv paths.
- **Status state machine**: `stopped` → `starting` → `running` (first stdout/stderr) or `error`. 3s fallback promotes silent processes.
- **Termination**: Delegates to `platform.ts` (SIGTERM → SIGKILL on Unix; taskkill on Windows).
- **Logs**: buffers up to 500 lines per process. Timestamped system messages. Micro-batched broadcasting via `process.nextTick()`.
- **Metrics**: Delegates to `platform.ts` for OS-specific CPU/mem readings.

### Port Utilities (`electron/port-utils.ts`)

- **`checkPort(port)`**: Uses `lsof` on macOS, falls back to TCP bind on both `127.0.0.1` and `0.0.0.0`.
- **`findFreePort(startPort)`**: Scans up to 50 ports ahead.
- **`probePort(port)`**: TCP health check with 1s timeout.
- **`injectPortFlag()`**: Auto-detects framework from command and injects correct port flag (e.g., `--port`, `--server.port`, `-p`). Handles npm/yarn/pnpm with proper `--` separator.

### Project Scanner (`electron/project-scanner.ts`)

Auto-discovers projects on disk by reading framework config files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Dockerfile`, etc.). Detects Next.js, Nuxt, Astro, Remix, Svelte, Vite, Express, Flask, Django, FastAPI, Streamlit, Spring, Ruby, Rust, Go, Docker. Max 3 levels deep, 200 results.

### Renderer (`src/`)

`App.tsx` checks `window.location.hash` to render either `TrayApp` or `ConsoleApp`.

**Tray app** (`src/components/AppList.tsx` as root): Three views via `view` state: `'list'` | `'add'` | `'logs'`.

**Console app** (`src/ConsoleApp.tsx`): Tab-based dashboard with five tabs -Dashboard (metrics overview), Apps (sortable table), Logs (multi-app log viewer), Config (raw JSON editor), Settings.

**State management** (`src/hooks/useApps.ts`): Single `useApps()` hook. `apps[]` loaded once; `statuses{}` updated by `onStatusUpdate` listener. Also manages `toasts[]` and `pendingOps` set. `getAppStatus()` aggregates grouped app component statuses.

**Key components**:
- `AppList.tsx` -Tray main view. Search/filter, running/error counters, renders `AppCard` or `GroupedAppCard`. Footer with Add App. Uses `SortableAppList` for drag-and-drop reordering (`@dnd-kit`).
- `AppCard.tsx` -Single app row: StatusBadge, name, type pill, port, error. Hover-only remove button.
- `GroupedAppCard.tsx` -Expandable card for multi-service apps.
- `AppForm.tsx` -Add/edit form. Supports multi-service toggle via `ComponentServiceEditor`.
- `LogViewer.tsx` -Live log viewer, polls every 1s, smart auto-scroll, color-coded output.
- `ProjectScanner.tsx` / `ScanConfigurePhase.tsx` -Auto-discover projects from selected directories.
- `Icon.tsx` -Centralized SVG icon component (used everywhere via `<Icon name="..." />`).
- `Toast.tsx` / `ToastContainer` -Ephemeral notifications (3s auto-dismiss).
- `ThemeToggle.tsx` -Cycles dark/light/system theme. State persisted in `useTheme` hook.

### Types

**Shared** (`shared/types.ts`) -imported by both main and renderer:
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

**Renderer-only** (`src/types.ts`) -re-exports shared types and adds `ElectronAPI` interface + `Window` global declaration.

### Type Registry (`src/typeRegistry.ts`)

Single source of truth for all app type metadata (label, Tailwind classes, category). Do not add `typeStyles` objects to individual components -use `getTypeClasses(type)` or `typeRegistry[type]` instead. Types are grouped into `Frontend | Backend | DevOps | Other` categories for form dropdowns.

## Website (`launchpad-website/`)

Separate React 19 + Vite 6 + Tailwind CSS v4 SPA deployed to GitHub Pages at `launchpad.princejain.me`. Features OS-aware download buttons, interactive UI mockup, install command display (Homebrew/winget), and dark/light theme. Deployed via `.github/workflows/deploy-website.yml` on pushes to `launchpad-website/`.

## CI/CD (`.github/workflows/`)

- **`ci.yml`**: Lint + build on macOS, lint + build + test on Windows. Skips when only website files change.
- **`release.yml`**: Triggered on `v*` tags. Parallel jobs build macOS DMG and Windows NSIS installer, then upload to GitHub Releases.
- **`deploy-website.yml`**: Deploys `launchpad-website/` to GitHub Pages on push or manual dispatch.

## Data Store (`apps.json`)

Two entry shapes:
- **Single**: `{ id, name, type, path, command, port, autoStart?, tags? }`
- **Grouped**: `{ id, name, type: "grouped", components: [...], autoStart?, tags? }`

See `apps.example.json` for a reference template.

## TypeScript Setup

Project references: `tsconfig.json` → `tsconfig.app.json` (ES2022, `src/`) + `tsconfig.node.json` (ES2023, `electron/` + `vite.config.ts`).

Critical: `verbatimModuleSyntax: true` (use `import type` for type-only imports), `allowImportingTsExtensions: true`, `strict: true`. Both `src/` and `electron/` import from `shared/` using relative paths.

## Styling

Tailwind CSS v4 via `@import "tailwindcss"` -no `tailwind.config.js`. Supports dark/light/system via `useTheme` hook (adds `dark` class to `<html>`).

Shared CSS classes in `src/index.css`: `.btn-icon`, `.btn-action-start`, `.btn-action-stop`, `.btn-secondary`, `.input-field`. Custom 4px scrollbar styles.

## Build Output

- `dist/` -Vite-bundled React renderer
- `dist-electron/main.js` + `dist-electron/preload.js` -compiled Electron code
- `release/` -electron-builder output (DMG on macOS, NSIS EXE on Windows)
- Tray icon: `resources/trayIconTemplate.png` + `@2x.png` (macOS template images), `resources/icon.png` (Windows)

## Adding a New IPC Channel

1. Add handler in `electron/ipc-app-handlers.ts` or `ipc-system-handlers.ts` via `ipcMain.handle('channel:name', handler)`
2. Expose in `electron/preload.ts` via `ipcRenderer.invoke('channel:name')`
3. Add method signature to `ElectronAPI` interface in `src/types.ts`
4. Call via `window.electronAPI.methodName()` in renderer

## Adding a New App Type

1. Add to `AppType` union in `shared/types.ts`
2. Add entry in `typeRegistry` in `src/typeRegistry.ts` (label, classes, category)
3. That's it -forms and cards consume the registry automatically
