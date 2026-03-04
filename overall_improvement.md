# Launchpad — Consolidated Improvement Plan

> Produced by cross-referencing `Arch_improvement.md` and `Design_improvement.md` against the actual codebase. Every claim has been validated; false positives are flagged. Effort is calibrated for a solo developer working in occasional sessions.
>
> **Distribution target:** Open-source on GitHub, installable via Homebrew Cask (like [CodexBar](https://github.com/steipete/CodexBar): `brew install --cask yourname/tap/launchpad`).

---

## Table of Contents

0. [Open-Source Readiness (NEW)](#0-open-source-readiness)
1. [Audit Accuracy Report](#1-audit-accuracy-report)
2. [Confirmed Bugs — Fix Immediately](#2-confirmed-bugs)
3. [Prioritized Backlog](#3-prioritized-backlog)
4. [Items NOT Worth Doing (Yet)](#4-items-not-worth-doing)
5. [Effort Summary](#5-effort-summary)

---

## 0. Open-Source Readiness

Going public changes the priority of several items and adds new requirements. This section covers everything needed **before the first public commit**.

### 0.1 Critical: Personal Data Leak

`apps.json` contains your personal filesystem paths (`/Users/prince.jain/...`), project names, and directory structure. This file **must not be committed** to a public repo.

**Fix:**
1. Add `apps.json` and `apps.json.bak` to `.gitignore`
2. Create `apps.example.json` with sanitized demo entries for documentation
3. The app already handles missing `apps.json` gracefully (returns `{ apps: [] }`)

**Effort:** 10 min

### 0.2 Missing: LICENSE File

No LICENSE file exists at the project root. Without one, the code is "all rights reserved" by default — nobody can legally use it.

**Fix:** Add `LICENSE` with MIT (matching CodexBar's approach). Permissive, standard for dev tools.

**Effort:** 2 min

### 0.3 Missing: README.md

No README exists. For an open-source project, this is the front door. Needs:
- What it is (1-2 sentences + screenshot/GIF)
- Install instructions (Homebrew cask + manual DMG download)
- Build from source instructions (`npm install && npm run dev`)
- How to add apps (brief)
- Tech stack
- License

**Effort:** 1 hr (including screenshot capture)

### 0.4 Missing: GitHub Actions CI/CD

No `.github/` directory exists. For CodexBar-style distribution, you need:

**Minimum CI workflow (`.github/workflows/ci.yml`):**
- Trigger on PR and push to main
- `npm ci && npm run lint && npm run build`
- Catches build failures before merge

**Release workflow (`.github/workflows/release.yml`):**
- Trigger on version tag (`v*`)
- Build DMG via `electron-builder --mac --publish always`
- Upload DMG to GitHub Releases automatically
- Optionally: update Homebrew tap cask formula

**Effort:** 2 hrs

### 0.5 Update `package.json` for Public Distribution

Current issues:
- `"private": true` — prevents `npm publish` (fine if not publishing to npm, but signal to remove)
- No `license`, `repository`, `author`, `homepage`, or `keywords` fields
- No electron-builder publish configuration

**Fix:**
```jsonc
{
  "name": "launchpad",
  "version": "1.0.0",
  "private": true,  // keep — not distributing via npm
  "license": "MIT",
  "author": "Prince Jain",
  "repository": "github:princejain/launchpad",
  "homepage": "https://github.com/princejain/launchpad",
  "description": "macOS menu bar app for launching and managing local dev servers",
  "keywords": ["electron", "menubar", "developer-tools", "macos"],
  "build": {
    "publish": [{
      "provider": "github",
      "owner": "princejain",
      "repo": "launchpad"
    }]
  }
}
```

**Effort:** 15 min

### 0.6 Expand `.gitignore`

Current `.gitignore` is minimal (6 lines). For public release, add:

```
# Already present
node_modules
dist
dist-electron
release
*.log
.DS_Store

# Add these
apps.json
apps.json.bak
pids.json
.env
*.dmg
*.zip
```

**Effort:** 5 min

### 0.7 Homebrew Tap Setup

CodexBar uses a separate repo (`steipete/homebrew-tap`) containing a cask formula. You'd need:

1. Create repo `yourname/homebrew-tap`
2. Add `Casks/launchpad.rb` pointing to the GitHub Release DMG URL
3. Users install via: `brew install --cask yourname/tap/launchpad`

The cask formula updates on each release (manually or via CI).

**Effort:** 1 hr (initial setup, simple once you've done it)

### 0.8 Code Signing Consideration

Unsigned macOS apps trigger Gatekeeper warnings ("app is damaged" / "can't be opened"). Options:

| Option | Cost | UX |
|--------|------|-----|
| Apple Developer ID ($99/yr) | Paid | Seamless install, no warnings |
| Ad-hoc signing | Free | Users must right-click → Open, or `xattr -cr` the app |
| No signing | Free | Same as ad-hoc but less predictable |

CodexBar uses proper signing. For a hobby project, ad-hoc signing + README instructions for the workaround is acceptable. Document it clearly in the README.

**Effort:** 30 min (ad-hoc setup) or 2 hrs (full Developer ID + notarization)

### 0.9 Auto-Update (Optional but Recommended)

`electron-updater` (already compatible with your `electron-builder` setup) can check GitHub Releases for new versions and prompt the user to update. CodexBar uses Sparkle (Swift equivalent).

**Effort:** 2 hrs

### Priority Changes Due to Open-Source

Several existing backlog items change priority when the app is public:

| Item | Old Priority | New Priority | Why |
|------|-------------|-------------|-----|
| 2.5 ESLint config | Tier 2 | **Tier 0** | CI needs it on day one |
| 3.4 ConfirmDialog accessibility | Tier 3 | **Tier 2** | Public users expect basic a11y |
| 4.6 First-run experience | Tier 4 | **Tier 2** | Public users have no pre-existing `apps.json`; empty state is their first impression |
| 3.6 Redesign quit button | Tier 3 | **Tier 2** | Strangers won't know a subtle icon kills all processes |
| Security note (`config:raw:write`) | Informational | **Document in README** | Open-source users will audit security surface |

**Total Tier 0 effort: ~5-7 hours**

---

## 1. Audit Accuracy Report

Both audits were largely correct. A few claims were wrong or overstated. This section documents every discrepancy so you can trust the rest of this document.

### Correct Claims

| Claim | Source | Verified |
|-------|--------|----------|
| `main.ts` is a monolith (751 lines, 25+ IPC handlers) | Arch | `electron/main.ts` — 751 lines, 25 `ipcMain.handle` registrations |
| `AppEntry`/`AppComponent` redefined in main process | Arch | `main.ts:114-133` — weaker `string` types vs renderer's `AppType` union |
| `getAppStatus` duplicated 3 times | Both | `useApps.ts:185`, `DashboardTab.tsx:7`, `AppsTab.tsx:6` — identical logic |
| `formatUptime` duplicated 2 times | Both | `AppCard.tsx:6`, `AppsTab.tsx:17` — identical logic |
| `getLineClass` duplicated 2 times | Both | `LogViewer.tsx:82`, `LogsTab.tsx:64` — identical logic |
| Outside-click handler duplicated 3 times | Both | `AppCard.tsx:51`, `GroupedAppCard.tsx:43`, `AppsTab.tsx:205` |
| Menu component written 3 times | Both | `AppCard.tsx` (MenuItem+MenuIcon), `GroupedAppCard.tsx` (OverflowItem), `AppsTab.tsx` (RowMenu+MenuBtn) |
| AddAppForm/EditAppForm severe duplication | Both | 328 vs 302 LOC, ~75-80% identical |
| No `src/utils/` directory | Arch | Confirmed — does not exist |
| No ESLint config file | Arch | No `eslint.config.mjs`, `.eslintrc.*`, or any variant found |
| `app:status` and `app:logs` lack try/catch | Arch | `main.ts:387` and `main.ts:443` — raw returns with no error wrapping |
| `app:startComponent` missing `comp.type` | Arch | `main.ts:481` — `startApp(comp.id, comp.path, comp.command, comp.port)` omits type |
| Console tabs duplicate data fetching | Both | DashboardTab, AppsTab, LogsTab all independently fetch apps + subscribe to statuses |
| DashboardTab uses static `app.port` | Arch | `DashboardTab.tsx:127` — shows `app.port` not runtime-resolved port |
| AppsTab uses static `app.port` | Arch | `AppsTab.tsx:150-154` — shows/opens `app.port` not runtime-resolved port |
| `typeRegistry.ts` is good centralization | Both | Confirmed — single source of truth for app-type labels and colors |

### False Positives

| Claim | Source | Reality |
|-------|--------|---------|
| LogsTab `selectedAppId` missing from useEffect deps | Arch | **Not a real bug.** The first useEffect (`LogsTab.tsx:13-24`) reads `selectedAppId` without it in deps `[]`, but it only runs on mount when `selectedAppId` is always `''`. The auto-select works correctly. The second useEffect (`LogsTab.tsx:26-44`) correctly has `[selectedAppId]` in its deps. |

### Overstated Claims

| Claim | Source | Reality |
|-------|--------|---------|
| Status border classes in "6 files" | Arch §3.3 | **Actually 2 files**: `AppCard.tsx:64-66` and `GroupedAppCard.tsx:54-55`. The other files (AppList, DashboardTab, ConfigTab, ConfirmDialog) do not use these exact border classes. |
| "~40 inline SVG blocks" | Design §1.4 | **Actually ~49 inline SVGs** across 13 files. The audit undercounted. Heaviest files: AppCard (8), GroupedAppCard (8), AppsTab (6), ConsoleApp (5). |
| AddAppForm/EditAppForm "~85% identical" | Design §1.6 | **~75-80% identical**. The multi-service toggle (AddAppForm) vs pre-loaded state (EditAppForm) and ID generation logic create ~20-25% genuine divergence. Still a clear DRY violation. |
| `getAppStatus` "in useApps.ts" | Arch §3.1 | **Correct** — exists at `useApps.ts:185` as a `useCallback`. The arch audit was right here; the function exists in all 3 stated locations. |
| Font size "9 distinct sizes" is a problem | Design §1.1 | **Accurate count, overstated severity.** The tray window intentionally uses micro-typography (8-13px) for density in a 420px popup. The console window sizes (12-14px, 2xl) are appropriate for their context. This is a density-optimized design, not an accident. |

---

## 2. Confirmed Bugs

These are real bugs that affect correctness. Fix before anything else.

### Bug 1: `app:startComponent` missing type parameter

**Location:** `electron/main.ts:481`
**Impact:** Port-flag injection (keyed off app type) won't work for individually-started grouped components. The process manager receives `undefined` for type.
**Current code:**
```typescript
startApp(comp.id, comp.path, comp.command, comp.port)
```
**Fix:**
```typescript
startApp(comp.id, comp.path, comp.command, comp.port, comp.type)
```
**Effort:** 1 minute

### Bug 2: Static port display in DashboardTab

**Location:** `src/console/DashboardTab.tsx:126-128`
**Impact:** If `findFreePort` picked a different port than configured, the dashboard shows the wrong URL.
**Current code:**
```tsx
{app.port && isRunning && (
  <span className="text-[11px] text-neutral-500 font-mono">localhost:{app.port}</span>
)}
```
**Fix:** Use `statuses[app.id]?.port || app.port` for both display and open action.
**Effort:** 5 minutes

### Bug 3: Static port display/action in AppsTab

**Location:** `src/console/AppsTab.tsx:150-154`
**Impact:** Same as Bug 2 — "Open in Browser" navigates to the configured port, not the actual runtime port.
**Fix:** Same pattern — use runtime port from `statuses[app.id]?.port` with fallback to `app.port`.
**Effort:** 5 minutes

### Bug 4: Two IPC handlers lack error wrapping

**Location:** `electron/main.ts:387` (`app:status`) and `main.ts:443` (`app:logs`)
**Impact:** If `getAllStatuses()` or `getLogs()` ever throw, the renderer gets an unhandled rejection instead of `{ ok: false, error }`.
**Fix:** Wrap in try/catch returning `ipcError(...)`.
**Effort:** 5 minutes

**Total bug-fix effort: ~15 minutes**

---

## 3. Prioritized Backlog

Items are grouped into tiers. Within each tier, items are ordered by impact-to-effort ratio.

### Tier 1: Structural Fixes (High Impact, Low-Medium Effort)

These address the root causes of ongoing development friction. Do these in your next focused session.

| # | Item | What | Why | Effort |
|---|------|------|-----|--------|
| 1.1 | **Extract shared utilities** | Create `src/utils/status.ts` (`getAppStatus`, status card classes), `src/utils/format.ts` (`formatUptime`, `getLineClass`). Delete the 7 duplicate copies. | Every new view will copy-paste these again. Stops the bleeding. | 30 min |
| 1.2 | **Extract `useClickOutside` hook** | Create `src/hooks/useClickOutside.ts`. Replace 3 identical `mousedown` listener patterns (AppCard, GroupedAppCard, AppsTab). | This exact pattern is already in 3 files and will appear in every new menu/popover. | 20 min |
| 1.3 | **Split `main.ts` into modules** | Extract to: `ipc-handlers.ts` (~300 lines, all `ipcMain.handle` calls), `config-store.ts` (~100 lines, `readApps`/`writeApps`/`validateAppEntry`/cache), leaving `main.ts` as lifecycle+tray (~150 lines). | 751 lines with 25 handlers is the #1 barrier to finding anything. The split is mechanical — no logic changes. | 1.5 hrs |
| 1.4 | **Shared types file** | Create `shared/types.ts` with `AppEntry`, `AppComponent`, `AppStatus`, `StatusInfo`, `IpcResult`. Import in both `tsconfig.app.json` and `tsconfig.node.json`. Delete duplicate interfaces from `main.ts:114-133`. | Eliminates silent type drift between main and renderer. The main process currently uses `type: string` where renderer uses `type: AppType`. | 30 min |
| 1.5 | **Merge AddAppForm + EditAppForm** | Create single `AppForm.tsx` with `mode: 'add' | 'edit'` prop. Extract shared `Field` component to `src/components/Field.tsx`. | ~250 lines of near-identical code. Every form change currently requires editing two files. | 1.5 hrs |

**Tier 1 total: ~4 hours**

### Tier 2: Component Library Foundations (Medium Impact, Medium Effort)

These prevent duplication from accumulating further as you add features.

| # | Item | What | Why | Effort |
|---|------|------|-----|--------|
| 2.1 | **Shared `OverflowMenu` component** | Build one reusable popover menu component using the `useClickOutside` hook from 1.2. Replace the 3 separate implementations (MenuItem, OverflowItem, RowMenu+MenuBtn). | 3 implementations, each ~40-60 lines, with divergent icon handling. The next view will create a 4th. | 1 hr |
| 2.2 | **`Icon` component with SVG map** | Create `src/components/Icon.tsx` with a `name` → SVG-path map for the ~8-10 unique icons (play, stop, restart, terminal, trash, edit, dots, chevron, search, external-link). Replace ~49 inline SVGs. | Largest source of visual code bloat. New icons currently mean copy-pasting SVG paths. | 1.5 hrs |
| 2.3 | **Console data provider** | Create `ConsoleDataProvider` React context wrapping all console tabs. Provides `apps`, `statuses`, action handlers. Eliminate the triplicated useEffect data-fetching blocks in DashboardTab, AppsTab, LogsTab. | Each console tab independently fetches the same data with ~15 identical lines. A 6th tab would mean a 4th copy. | 1 hr |
| 2.4 | **Status color tokens** | Create `src/tokens.ts` exporting `statusColors` map (dot, border, bg classes per status). Replace hardcoded Tailwind strings in AppCard, GroupedAppCard, StatusBadge, Toast. | Status colors are defined 3 different ways across the codebase. A palette change means finding every instance. | 30 min |
| 2.5 | **Add ESLint config** | Create `eslint.config.mjs` with the already-installed ESLint 9 + React + TypeScript plugins. Run once to confirm it works. | `npm run lint` currently fails silently or errors. Config exists in `package.json` scripts but has no config file. | 15 min |

**Tier 2 total: ~4.5 hours**

### Tier 3: Interaction Polish (Medium Impact, Medium-High Effort)

These raise the app from "functional tool" to "tool you'd recommend." Do when motivated, not as obligations.

| # | Item | What | Why | Effort |
|---|------|------|-----|--------|
| 3.1 | **Inline form validation** | Add field-level error messages to AppForm (merged from 1.5). Port range 1-65535, required fields with red borders and helper text. | Currently: disabled submit button with no feedback about what's wrong. Violates CLAUDE.md form validation rule. | 1 hr |
| 3.2 | **Name magic numbers** | In `process-manager.ts`, replace literal `500`, `3000`, `5000`, `50`, `2000` with named constants at file top (`MAX_LOG_LINES`, `PROMOTION_TIMEOUT_MS`, `SIGKILL_TIMEOUT_MS`, etc.). | You will not remember what `5000` means in 3 months. | 15 min |
| 3.3 | **Shallow-compare status updates** | In `useApps.ts`, add `JSON.stringify` equality check before calling `setStatuses`. Prevents full-tree re-render every 1s when nothing changed. | Minor perf improvement. Matters at 20+ apps, negligible at current 7-8. | 15 min |
| 3.4 | **ConfirmDialog accessibility** | Add `role="dialog"`, `aria-modal="true"`, focus trap, Escape-to-close. | Cosmetic for personal use, but essential if the app is shared or open-sourced. | 45 min |
| 3.5 | **Consolidate CSS hex values** | Replace hardcoded hex in `src/index.css` (`#34d399`, `#f87171`, `#404040`, etc.) with Tailwind v4 theme references or CSS custom properties. | Two color systems (hex in CSS + Tailwind utilities in TSX) will drift independently. | 30 min |
| 3.6 | **Redesign quit button** | Increase visual weight of the 12px power icon in `App.tsx` title bar. Either add text label, distinct color, or move to a menu. | A single neutral-400 icon that kills all running processes is dangerously subtle. | 15 min |

**Tier 3 total: ~3 hours**

### Tier 4: Future Enhancements (Nice-to-Have)

Do these when you want to work on the product rather than the code. No urgency.

| # | Item | What | Effort |
|---|------|------|--------|
| 4.1 | View transition animations | Slide-in/slide-out for tray view navigation (list → logs → back). | 2 hrs |
| 4.2 | Keyboard shortcuts | `Cmd+K` for search, `Escape` for back, arrow navigation, `Enter` to start/stop. Global shortcut already exists (`Cmd+Shift+L`). | 1.5 hrs |
| 4.3 | `system` theme option | Three-way toggle: Dark / Light / System (follow `prefers-color-scheme`). | 30 min |
| 4.4 | Drag-to-reorder | Wire `app:reorder` IPC (already exists) to drag handles on cards. Use `@dnd-kit/core`. | 2 hrs |
| 4.5 | Undo for destructive actions | Replace immediate delete + toast with "Removed — Undo" toast that delays actual deletion by 5s. | 1 hr |
| 4.6 | First-run experience | Auto-detect projects in `~/Developer`, `~/Projects`. Suggest configs from `package.json`, `pyproject.toml`. | 3 hrs |
| 4.7 | Console route-based navigation | Replace conditional tab rendering with hash-based routing for deep-linking and back-button support. | 1.5 hrs |
| 4.8 | Type dropdown grouping | Group the 19 app types into categories (Frontend/Backend/DevOps) or add auto-detection from `package.json`/`pyproject.toml`. | 1 hr |

**Tier 4 total: ~12.5 hours (pick and choose)**

---

## 4. Items NOT Worth Doing

These were suggested by one or both audits but aren't worth the effort at current scale.

| Suggestion | Why Skip |
|------------|----------|
| **Design token file** (`tokens.ts` with typography/spacing/radius/elevation maps) | Over-engineering for a solo tray app. Tailwind classes ARE the token system. Extracting `statusColors` (2.4) is enough. The full token file adds indirection without proportional benefit. |
| **`ManagedProcess` Map cleanup on remove** | Entries persist after stop but this is irrelevant for <50 apps. The Map holds lightweight metadata, not child processes. |
| **Layout primitives** (`<Card>`, `<PageHeader>`, `<ActionBar>`, `<DataTable>`) | Premature abstraction. The app has 2 surfaces with distinct densities. Generic layout components would be unused or fight the designs. Build when 3+ views share a layout pattern. |
| **`key={i}` → stable IDs for log lines** | Log lines are append-only, never reordered or individually updated. Index keys are correct here. |
| **Port check interval cleanup** in process-manager | The 30s timeout creates one extra timer per app start. The interval already clears on success. This is a micro-optimization with zero user impact. |
| **Team ownership model** (5 engineers) | Irrelevant for a solo project. If it grows to a team, revisit. |
| **Replace `prefers-color-scheme` handling** with Tailwind v4 built-in dark mode | Current `.dark` class approach works. Migration adds risk for zero functional gain. |

---

## 5. Effort Summary

| Tier | Focus | Total Effort | Recommendation |
|------|-------|-------------|----------------|
| **Tier 0** | **Open-source readiness (LICENSE, README, .gitignore, CI, personal data)** | **~5-7 hrs** | **Must-do before first public commit** |
| Bugs | Fix 4 real bugs | 15 min | Do now — before you forget the context |
| Tier 1 | Structural fixes (DRY, split main.ts, shared types) | ~4 hrs | Do before or alongside public release |
| Tier 2 | Component library foundations + promoted items (Icon, OverflowMenu, first-run, a11y) | ~6 hrs | Do shortly after release — first-run experience is critical for new users |
| Tier 3 | Interaction polish (validation, naming, CSS consolidation) | ~2 hrs | Do when motivated |
| Tier 4 | Future enhancements (animations, shortcuts, DnD, auto-update) | ~12.5 hrs | Pick and choose |

### Recommended Sequence for Public Launch

**Session 1 — Ship-blockers (~3 hours):**
Bugs (15 min) + Tier 0 items 0.1-0.3, 0.5-0.6 (LICENSE, README, .gitignore, package.json, strip personal data)

**Session 2 — CI + Distribution (~3 hours):**
Tier 0 items 0.4, 0.7, 0.8 (GitHub Actions, Homebrew tap, code signing)

**Session 3 — Code quality before public eyes (~3 hours):**
Items 1.1, 1.2, 1.4, 2.5 (shared utils, useClickOutside, shared types, ESLint)

**Session 4 — Structural cleanup (~3 hours):**
Items 1.3, 1.5 (split main.ts, merge forms)

**Session 5 — Public-user experience (~3 hours):**
Items 4.6 (first-run experience — promoted from Tier 4), 3.6 (quit button), 3.4 (dialog a11y)

After these five sessions (~15 hours total), the project will be:
- Publicly installable via `brew install --cask yourname/tap/launchpad`
- CI-verified on every push
- Free of personal data leaks
- Free of known bugs
- Structurally clean with no duplicated utilities
- Welcoming to first-time users (README, first-run experience, proper empty state)
- Passing ESLint

Everything after that is feature work and polish you can do in public with contributor input.
