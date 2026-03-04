# Launchpad -Architecture & Engineering Audit

> **Context:** Side project, not a product scaling to millions. Recommendations are calibrated for a solo developer who dips in occasionally. Some loss of modularity and low-level vulnerability is acceptable.

---

## Table of Contents

1. [Architectural Strengths](#1-architectural-strengths)
2. [Critical Issues (Fix These)](#2-critical-issues)
3. [Structural Debt](#3-structural-debt)
4. [Cosmetic Debt](#4-cosmetic-debt)
5. [Security Assessment](#5-security-assessment)
6. [Performance & Efficiency](#6-performance--efficiency)
7. [UI Engineering Discipline](#7-ui-engineering-discipline)
8. [Technical Debt Categorization](#8-technical-debt-categorization)
9. [Best Practices to Follow](#9-best-practices-to-follow)
10. [Prioritized Refactor Roadmap](#10-prioritized-refactor-roadmap)
11. [Target Architecture State](#11-target-architecture-state)
12. [Team Ownership (If 5 Engineers)](#12-team-ownership-if-5-engineers)

---

## 1. Architectural Strengths

### Clean Electron isolation
The three-process split (main → preload → renderer) with `contextBridge` is textbook correct. The preload is thin (47 lines), the API surface is explicit, and there's no `nodeIntegration: true` shortcut. This is the single most important architectural decision in an Electron app.

### Process manager is well-contained
`process-manager.ts` owns all child-process lifecycle behind a clean functional API (`startApp`, `stopApp`, `getLogs`, `killAll`). The status state machine is coherent, login-shell spawning solves the PATH problem elegantly, and venv auto-detection is a practical touch.

### Type registry is centralized
`typeRegistry.ts` gives a single source of truth for app-type labels and colors, avoiding scattered `typeStyles` objects in every card component.

### Minimal dependency footprint
Only 2 runtime deps (react, react-dom). Everything else is devDependencies. No bloated utility libraries. Modern stack (React 19, Vite 7, Tailwind v4, Electron 40).

### Error boundary exists
`ErrorBoundary.tsx` catches renderer crashes. Most side projects skip this entirely.

---

## 2. Critical Issues

### 2.1 `main.ts` is a 756-line monolith

**Problem:** Mixes window creation, tray management, IPC handlers (30+), `apps.json` I/O, type definitions, and app lifecycle into one file. Coming back after a month means spending 20 minutes just finding the handler you need.

**Fix -split into 3-4 files:**

```
electron/
  main.ts           → app lifecycle, window creation, tray (≈150 lines)
  ipc-handlers.ts   → all ipcMain.handle registrations (≈300 lines)
  config-store.ts   → apps.json read/write/cache/validate (≈100 lines)
  process-manager.ts → unchanged
  preload.ts         → unchanged
```

Just `import { setupIPC } from './ipc-handlers.ts'` and call it from `main.ts`.

### 2.2 Type duplication between main and renderer

**Problem:** `AppEntry` and `AppComponent` are redefined in `main.ts` (lines 113–132) instead of importing from `src/types.ts`. The main process and renderer can silently drift out of sync.

**Fix:** Create `shared/types.ts` that both tsconfigs include:

```
shared/
  types.ts    → AppEntry, AppComponent, AppStatus, StatusInfo, IpcResult
```

Update both `tsconfig.app.json` and `tsconfig.node.json` `include` arrays to add `"shared"`.

### 2.3 Three real bugs in the console tabs

| Bug | Location | Impact |
|-----|----------|--------|
| Uses `app.port` (static config) instead of `statuses[app.id]?.port` (runtime-resolved) | `DashboardTab.tsx` line 125, `AppsTab.tsx` line 154 | "Open" button goes to wrong URL if `findFreePort` picked a different port |
| `app:startComponent` doesn't pass `comp.type` to `startApp()` | `main.ts` line 481 | Port-flag injection (which keys off type) won't work for grouped app components |
| `useEffect` reads `selectedAppId` but doesn't include it in deps | `LogsTab.tsx` lines 13–24 | Stale closure -auto-select doesn't update when selection changes |

### 2.4 Two IPC handlers lack error handling

**Problem:** `app:status` and `app:logs` in `main.ts` return raw data without try/catch. If `getStatus()` or `getLogs()` ever throw, the renderer gets an unhandled promise rejection instead of `{ ok: false, error }`.

**Fix:**
```typescript
ipcMain.handle('app:status', (_e, id: string) => {
  try { return getStatus(id) }
  catch (err) { return ipcError(String(err)) }
})
```

---

## 3. Structural Debt

### 3.1 Duplicated logic across renderer

Three functions are copy-pasted across 2-3 files each:

| Function | Duplicated in |
|----------|---------------|
| `getAppStatus()` | `useApps.ts`, `DashboardTab.tsx`, `AppsTab.tsx` |
| `formatUptime()` | `AppCard.tsx`, `AppsTab.tsx` |
| `getLineClass()` | `LogViewer.tsx`, `LogsTab.tsx` |

**Fix:** Create `src/utils/status.ts` and `src/utils/format.ts`. Extract once, import everywhere.

### 3.2 AddAppForm and EditAppForm share ~80% of their code

The `Field` component, `ComponentDraft` interface, and form layout are nearly identical.

**Fix:** Extract a shared `AppForm` component that accepts `initialValues` and `onSubmit`. The add/edit distinction becomes a thin wrapper.

### 3.3 Status border classes are scattered

The string `border-emerald-500/20 bg-emerald-500/5` appears in **6 files**: `AppCard.tsx`, `GroupedAppCard.tsx`, `AppList.tsx`, `DashboardTab.tsx`, `ConfigTab.tsx`, `ConfirmDialog.tsx`.

**Fix:**
```typescript
// src/utils/styles.ts
export function statusCardClasses(status: AppStatus): string {
  switch (status) {
    case 'running': return 'border-emerald-500/20 bg-emerald-500/5'
    case 'error':   return 'border-red-500/30 bg-red-500/5'
    default:        return 'border-neutral-200 dark:border-neutral-800'
  }
}
```

### 3.4 Tests duplicate source logic instead of importing it

`validate-app-entry.test.ts` and `apps-cache.test.ts` re-implement the functions they test instead of importing from `main.ts`. After splitting `main.ts` into `config-store.ts`, tests can import directly and actually catch regressions.

---

## 4. Cosmetic Debt

### 4.1 Missing ESLint config
`package.json` has `"lint": "eslint ."` and ESLint 9 plugins installed, but there's no `eslint.config.mjs` in the project root. Running `npm run lint` will fail.

### 4.2 ConfirmDialog lacks accessibility basics
No `role="dialog"`, `aria-modal`, focus trap, or Escape-to-close. For a personal tool this is cosmetic, but matters if shared.

### 4.3 Hardcoded magic numbers in process-manager

| Value | What it is |
|-------|-----------|
| `500` | Max log lines |
| `3000` | Silent-process promotion timeout |
| `5000` | SIGKILL timeout |
| `50` | Port scan range |
| `2000` | Port probe interval |

Group them at the top of the file as named constants:
```typescript
const MAX_LOG_LINES = 500
const PROMOTION_TIMEOUT_MS = 3000
const SIGKILL_TIMEOUT_MS = 5000
const PORT_SCAN_RANGE = 50
const PORT_PROBE_INTERVAL_MS = 2000
```

---

## 5. Security Assessment

> Calibrated for a local-only menu bar app that manages your own dev servers.

**What's good:**
- Context isolation enabled (no `nodeIntegration`)
- Preload bridge with explicit method exposure
- No remote code loading
- No network-facing surface

**One thing to watch:** `config:raw:write` lets the renderer write arbitrary JSON to `apps.json`, and `apps.json` contains `command` fields that get passed to `spawn`. If you ever expose this app over a network or add a web UI, that's a command injection vector. For local-only use, it's a non-issue.

---

## 6. Performance & Efficiency

### 6.1 1-second status polling causes full-tree re-renders

`statuses` updates every second via `onStatusUpdate`. Since `useApps()` returns a new `statuses` object each time, every component consuming the hook re-renders -even if no status actually changed. For 6 apps this is fine. For 20+ it'll get sluggish.

**Pragmatic fix:** Shallow-compare the incoming statuses object and only update state if something actually changed:
```typescript
onStatusUpdate((newStatuses) => {
  setStatuses(prev => {
    if (JSON.stringify(prev) === JSON.stringify(newStatuses)) return prev
    return newStatuses
  })
})
```

### 6.2 Port check interval cleanup

In `process-manager.ts` (lines 349–355), the port-check interval runs every 2s until a 30s timeout, even if the port is confirmed listening. The `clearInterval` on success works, but the 30s `setTimeout` creates an unnecessary timer.

### 6.3 ManagedProcess entries never removed from Map

`processes` Map entries persist after stop -no explicit removal. Could grow over many add/remove cycles, though practically irrelevant for <50 apps.

---

## 7. UI Engineering Discipline

### Design tokens
- **Good:** `typeRegistry.ts` centralizes app-type colors.
- **Bad:** Status border colors, background tints, and button styles are hardcoded Tailwind strings scattered across 6+ files.
- **Fix:** Extract `statusCardClasses()` and consider a `tokens.ts` for shared color strings.

### Theme management
- `useTheme()` hook manages dark/light via `localStorage` + class toggling. Works well. Both tray and console windows use it independently -acceptable since they share `localStorage`.

### CSS duplication
- `index.css` defines shared `.btn-*` and `.input-field` classes -good.
- Status-related classes (border, background tints) are not centralized -see section 3.3.

### Tailwind discipline
- v4 via Vite plugin, no config file needed. CSS-first configuration is appropriate.
- Hardcoded hex colors in `index.css` (e.g. `#34d399`, `#f87171`) don't use Tailwind theme tokens. Fine for a side project, but a source of drift if colors change.

---

## 8. Technical Debt Categorization

### Cosmetic Debt
- [ ] Missing ESLint config file
- [ ] `ConfirmDialog` accessibility
- [ ] Magic number naming consistency
- [ ] `key={i}` for log lines (use stable IDs)

### Structural Debt
- [ ] `main.ts` monolith (756 lines)
- [ ] Type duplication (main vs renderer)
- [ ] `AddAppForm`/`EditAppForm` code duplication (~80% overlap)
- [ ] `getAppStatus`/`formatUptime`/`getLineClass` duplicated across files
- [ ] Status border classes in 6 files
- [ ] Tests duplicate source logic instead of importing

### Scalability Debt
- [ ] Full-tree re-render on every 1s status poll
- [ ] `ManagedProcess` Map entries never cleaned up

### Security Risks
- [ ] `config:raw:write` allows arbitrary command injection via `apps.json` (local-only, acceptable)
- [ ] No cache invalidation if `apps.json` edited externally

### Immediate Refactor Priorities
- [ ] Fix 3 bugs (port resolution, startComponent type, LogsTab deps)
- [ ] Add try/catch to `app:status` and `app:logs` handlers
- [ ] Split `main.ts` into modules

---

## 9. Best Practices to Follow

These are the practices that actually matter at side-project scale:

1. **One file, one responsibility.** If you can't describe what a file does in one sentence, split it. The `main.ts` monolith is the example.

2. **Don't copy-paste -extract.** Every time you catch yourself copying a function or a Tailwind class string to a second file, stop and extract it into a shared utility. Side projects rot fastest from copy-paste drift.

3. **Fix bugs immediately.** The three bugs above are the kind that will cost you 2 hours of debugging if you hit them 3 months from now and don't remember the codebase. Fix them while context is fresh.

4. **Keep types in one place.** The shared types file prevents the "main process thinks AppEntry has field X, renderer thinks it doesn't" class of bugs.

5. **Name your magic numbers.** When you come back after weeks, `SIGKILL_TIMEOUT_MS` is instantly comprehensible; `5000` is not.

6. **Don't over-abstract.** Your current component structure (AppCard, GroupedAppCard, LogViewer, etc.) is the right level of granularity. Resist the urge to create a generic `<Card variant="app" />` component system -that's enterprise complexity you don't need.

7. **Tests should import source, not rewrite it.** After the `main.ts` split, have tests import from the actual modules.

---

## 10. Prioritized Refactor Roadmap

| Priority | Task | Time | Impact |
|----------|------|------|--------|
| **P0** | Fix 3 bugs (port resolution, startComponent type, LogsTab deps) | 30 min | Correctness |
| **P0** | Add try/catch to `app:status` and `app:logs` IPC handlers | 5 min | Reliability |
| **P1** | Split `main.ts` into 3-4 modules | 1-2 hrs | Maintainability |
| **P1** | Extract shared types to `shared/types.ts` | 30 min | Type safety |
| **P2** | Extract `getAppStatus`, `formatUptime`, `getLineClass` into utils | 30 min | DRY |
| **P2** | Merge `AddAppForm`/`EditAppForm` into shared `AppForm` | 1 hr | DRY |
| **P2** | Extract `statusCardClasses()` utility | 15 min | DRY |
| **P3** | Add shallow-compare guard on status updates | 15 min | Performance |
| **P3** | Add ESLint config | 10 min | Tooling |
| **P3** | Group magic numbers as named constants | 15 min | Readability |

**Total estimated effort: ~5-6 hours** across multiple sessions.

---

## 11. Target Architecture State

Achievable in ~4 hours of focused refactoring:

```
electron/
  main.ts              # App lifecycle, window/tray creation (~150 lines)
  ipc-handlers.ts      # All IPC registrations (~300 lines)
  config-store.ts      # apps.json CRUD + cache + validation (~100 lines)
  process-manager.ts   # Child process lifecycle (unchanged)
  preload.ts           # Context bridge (unchanged)
  __tests__/
    config-store.test.ts   # Imports from config-store directly
    process-manager.test.ts

shared/
  types.ts             # AppEntry, AppComponent, AppStatus, StatusInfo, IpcResult

src/
  App.tsx
  main.tsx
  index.css
  types.ts             # ElectronAPI only (imports from shared/)
  typeRegistry.ts
  utils/
    status.ts          # getAppStatus, statusCardClasses
    format.ts          # formatUptime, getLineClass
  hooks/
    useApps.ts
    useTheme.ts
  components/
    AppList.tsx
    AppCard.tsx
    GroupedAppCard.tsx
    AppForm.tsx          # Merged add/edit
    LogViewer.tsx
    StatusBadge.tsx
    ConfirmDialog.tsx
    Toast.tsx
    ErrorBoundary.tsx
    ThemeToggle.tsx
  console/
    ConsoleApp.tsx
    DashboardTab.tsx
    AppsTab.tsx
    LogsTab.tsx
    ConfigTab.tsx
    SettingsTab.tsx
```

No state management library, no router, no monorepo, no dependency injection. Just cleaner file boundaries and shared utilities. The architecture is fundamentally sound -it just needs housekeeping.

---

## 12. Team Ownership (If 5 Engineers)

| Owner | Domain |
|-------|--------|
| Engineer 1 | Main process: process-manager, IPC, config store |
| Engineer 2 | Renderer: tray UI components, state management |
| Engineer 3 | Console window: dashboard, apps tab, logs tab |
| Engineer 4 | Infra: build pipeline, packaging, auto-update, CI |
| Engineer 5 | DX/Quality: testing, ESLint, type safety, accessibility |

For a solo side project, just keep the `main.ts` split clean and you'll have natural boundaries when context-switching between "working on the UI" and "working on process management."
