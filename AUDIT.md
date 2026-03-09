# Launchpad App — Architecture Audit & Improvement Plan

> Comprehensive audit from a Senior Software Architect + Lead QA Tester perspective.
> Date: 2026-03-09

---

## Part 1: Architecture Audit (Senior Software Architect)

### A. Security Issues

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| S1 | **CRITICAL** | `electron/port-utils.ts:12` | **Command injection** — `execSync(`lsof -i :${port}`)` interpolates user-controllable port value into shell command. Use `execFileSync('lsof', ['-i', `:${port}`, ...])` instead. |
| S2 | **CRITICAL** | `electron/platform.ts:31` | **Command injection** — `execSync(`taskkill /F /T /PID ${pid}`)` on Windows. Use `execFileSync('taskkill', ['/F', '/T', '/PID', String(pid)])`. |
| S3 | **HIGH** | `electron/platform.ts:41` | **Command injection** — `execSync(`pgrep -P ${pid}`)` fallback. Same fix: use `execFileSync`. |
| S4 | **MEDIUM** | `electron/ipc-app-handlers.ts:77` | **No input validation** — `app:update` merges arbitrary `Partial<AppEntry>` without schema validation. Could corrupt `apps.json`. |
| S5 | **MEDIUM** | Multiple IPC handlers | No validation on IPC inputs (id, paths, commands). All IPC channels should validate incoming data. |

### B. Concurrency & Race Conditions

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| R1 | **HIGH** | `electron/process-manager.ts:151-163` | `promoteToRunning()` can fire multiple times (stdout + stderr + 3s timeout), creating duplicate `setInterval` port probes. Use a flag to prevent re-entry. |
| R2 | **HIGH** | `electron/ipc-app-handlers.ts` | No deduplication — rapid `app:start` calls for the same app ID execute concurrently. Track in-flight ops per app. |
| R3 | **MEDIUM** | `electron/config-store.ts:73-78` | Synchronous file I/O (`writeFileSync`, `copyFileSync`) blocks the main Electron thread. Concurrent writes could corrupt data. |
| R4 | **MEDIUM** | `electron/port-utils.ts:18-25` | `checkPort()` — if `listen()` fails with a non-EADDRINUSE error, the promise may never resolve. Add a timeout. |

### C. Resource Leaks & Performance

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| P1 | **HIGH** | `electron/main.ts:186-193` | Status broadcast sends **full** status of all apps every 1s to all windows, regardless of changes. Implement delta-based broadcasting. |
| P2 | **MEDIUM** | `electron/platform.ts:82,97` | `execFile` calls for metrics have no timeout. Hung child processes accumulate. Add `{ timeout: 2000 }`. |
| P3 | **MEDIUM** | `electron/process-manager.ts:69-77` | Log trimming uses `splice(0, n)` which is O(n). With 500-line cap and high-frequency appends, use a circular buffer. |
| P4 | **LOW** | `electron/process-manager.ts` | Port probe intervals not cleaned up if process exits before `PORT_CHECK_MAX_DURATION_MS`. |

### D. Error Handling Gaps

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| E1 | **HIGH** | `electron/config-store.ts:52-67` | If both `apps.json` and `.bak` are corrupt, silently returns `{ apps: [] }`. User loses all config with no notification. Should emit IPC event to renderer. |
| E2 | **MEDIUM** | `electron/platform.ts:38-48` | Multiple nested `try/catch` with empty handlers. Failures in `pgrep` or `process.kill` are completely silent. |
| E3 | **MEDIUM** | `electron/ipc-app-handlers.ts:132-134` | `app:stopAll` stops apps sequentially. If one fails, subsequent apps may not stop. Use `Promise.allSettled()`. |

### E. Architecture Concerns

| # | Issue | Recommendation |
|---|-------|----------------|
| A1 | **Tight coupling** — IPC handlers directly call process-manager and config-store with no abstraction | Consider a thin service layer for testability |
| A2 | **State inconsistency** — In-memory process Map vs. `pids.json` can diverge on crash | Reconcile on startup; add periodic sync |
| A3 | **No circuit breaker** — Metrics gathering retries indefinitely on failure | Add backoff/disable after N failures |
| A4 | **Shared types not discriminated** — `AppEntry` allows `type: 'grouped'` without `components` | Use discriminated union: `SingleApp | GroupedApp` |

---

## Part 2: QA Audit (Lead QA Tester)

### A. Test Coverage — Current State

| Area | Files | Tests | Coverage |
|------|-------|-------|----------|
| Config store (cache) | `apps-cache.test.ts` | 9 tests | Tests a mock, not the real module |
| Process manager | `process-manager.test.ts` | 20 tests | Good but uses real child processes |
| Project scanner | `project-scanner.test.ts` | 33 tests | Excellent coverage |
| Validation | `validate-app-entry.test.ts` | 15 tests | Tests a copy of the function, not the real one |
| **IPC handlers** | **0 files** | **0 tests** | **UNTESTED** |
| **Platform layer** | **0 files** | **0 tests** | **UNTESTED** |
| **Port utilities** | **0 files** | **0 tests** | **UNTESTED** |
| **Main process** | **0 files** | **0 tests** | **UNTESTED** |
| **Renderer (React)** | **0 files** | **0 tests** | **UNTESTED — 37 source files** |

**Overall: ~8% of source files have any test coverage.**

### B. Test Infrastructure Gaps

1. **No coverage reporting** — vitest has no `coverage` configuration
2. **Tests only run on Windows in CI** — macOS CI job skips `npm run test`
3. **No tests before releases** — `release.yml` packages without running tests
4. **No renderer test setup** — No jsdom/happy-dom environment, no component tests
5. **Duplicated test logic** — `validate-app-entry.test.ts` copies the validation function instead of importing it
6. **No E2E tests** — No Playwright/Spectron for Electron integration testing

### C. CI/CD Issues

| # | Severity | Issue |
|---|----------|-------|
| CI1 | **CRITICAL** | Tests only run on Windows runner, not macOS — cross-platform bugs slip through |
| CI2 | **CRITICAL** | Release workflow (`release.yml`) does NOT run tests before building/publishing |
| CI3 | **HIGH** | No required status checks — PRs can merge without passing CI |
| CI4 | **HIGH** | No code coverage tracking or minimum threshold |
| CI5 | **MEDIUM** | No pre-commit hooks (husky/lint-staged) for automated linting |
| CI6 | **MEDIUM** | Build doesn't clean `dist/` before rebuilding |
| CI7 | **LOW** | No automated changelog generation on releases |

### D. Renderer (React) Issues

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| U1 | **HIGH** | `useApps.ts` + `useConsoleData.ts` | **Massive code duplication** — both hooks implement identical app fetching, status subscription, toast management, and pending ops. Extract shared hook. |
| U2 | **MEDIUM** | Multiple components | **Accessibility gaps** — Missing ARIA labels on status badges, theme toggle, custom checkboxes in ProjectScanner, no keyboard focus indicators |
| U3 | **MEDIUM** | `LogViewer.tsx:25` | Unhandled promise rejection — `getLogs()` has no `.catch()` handler |
| U4 | **MEDIUM** | `AppList.tsx:24-27` | `handleReorder` calls reorder then refresh with no error recovery if reorder fails |
| U5 | **MEDIUM** | `useApps.ts:52-62` | `pendingRemoves` timeout fires after unmount — no cleanup |
| U6 | **LOW** | `Icon.tsx` | Not wrapped in `React.memo` despite being rendered hundreds of times |
| U7 | **LOW** | `useApps.ts:67-69` | `JSON.stringify` comparison on every 1s status update — use targeted property comparison |

### E. Website Issues

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| W1 | **HIGH** | `launchpad-website/src/constants.ts` | **Wrong repo URLs** — References `launchpage-app` instead of `launchpad-app` (missing 'd'). Download links are broken. |
| W2 | **MEDIUM** | All components | Accessibility — Only 3 ARIA labels across entire site. Interactive elements need labels. |
| W3 | **MEDIUM** | `Showcase.tsx` | No `prefers-reduced-motion` support for animations |
| W4 | **MEDIUM** | Deploy workflow | No linting or type-checking before deployment |
| W5 | **LOW** | `index.html` | No JSON-LD structured data, no `robots.txt`, no sitemap |

### F. Build & Distribution Issues

| # | Severity | Issue |
|---|----------|-------|
| B1 | **HIGH** | macOS builds only target `arm64` — Intel Mac users excluded |
| B2 | **MEDIUM** | `identity: null` disables macOS code signing — Gatekeeper warning for users |
| B3 | **MEDIUM** | `package.json` repo URL typo: `launchpage-app` |
| B4 | **LOW** | `sharp` dev dependency only used for icon generation script — could be optional |

---

## Part 3: Prioritized Improvement Plan

### Phase 1: Critical Fixes (Security & Data Integrity)

1. **Fix command injection vulnerabilities** (S1, S2, S3)
   - `electron/port-utils.ts` — Replace `execSync` with `execFileSync`
   - `electron/platform.ts` — Replace string-interpolated `execSync` with `execFileSync` + args array

2. **Add IPC input validation** (S4, S5)
   - Export `validateAppEntry` from `config-store.ts` (stop duplicating in tests)
   - Validate all IPC handler inputs before processing

3. **Fix race conditions** (R1, R2)
   - Add re-entry guard to `promoteToRunning()` in `process-manager.ts`
   - Add per-app operation lock in IPC handlers

4. **Fix broken website URLs** (W1, B3)
   - `launchpad-website/src/constants.ts` — Fix `launchpage-app` → `launchpad-app`
   - `package.json` — Fix repo URL

### Phase 2: Test Infrastructure & CI/CD

5. **Fix CI pipeline** (CI1, CI2)
   - Add `npm run test` to macOS job in `ci.yml`
   - Add test step before build in `release.yml`

6. **Add coverage reporting**
   - Configure `vitest` coverage with `@vitest/coverage-v8`
   - Set minimum threshold (start at 30%, increase over time)

7. **Add missing critical tests**
   - `electron/__tests__/port-utils.test.ts` — Port checking, injection, edge cases
   - `electron/__tests__/platform.test.ts` — Mock child_process, test cross-platform logic
   - `electron/__tests__/ipc-handlers.test.ts` — Handler validation, error paths
   - Move validation function to shared module, import in tests

8. **Add pre-commit hooks**
   - Install `husky` + `lint-staged`
   - Run lint + type-check on staged files

### Phase 3: Code Quality & Architecture

9. **Extract shared state hook** (U1)
    - Create `src/hooks/useAppState.ts` — shared app fetching, status, toasts, pending ops
    - Refactor `useApps.ts` and `useConsoleData.ts` to consume it

10. **Fix error handling** (E1, E2, E3)
    - Config store: Emit `config:error` IPC event on data loss
    - Platform: Log meaningful messages in catch blocks
    - `stopAll`: Use `Promise.allSettled()`

11. **Make config writes async** (R3)
    - Convert `writeApps()` to async with `fs.promises`
    - Add write queue to prevent concurrent writes

12. **Implement delta-based status broadcast** (P1)
    - Track previous status snapshot
    - Only send changed entries

### Phase 4: Accessibility & UX

13. **Electron app accessibility** (U2)
    - Add ARIA labels to StatusBadge, ThemeToggle, action buttons
    - Fix custom checkboxes in ProjectScanner to use real `<input type="checkbox">`
    - Add `aria-current`/`aria-selected` to keyboard-focused items

14. **Website accessibility** (W2, W3)
    - Add ARIA labels to all interactive elements
    - Add `prefers-reduced-motion` media query wrapping animations
    - Add skip-to-main-content link

### Phase 5: Distribution & Polish

15. **Add Intel Mac support** (B1)
    - Add `x64` target to electron-builder mac config (or universal binary)

16. **Add renderer tests**
    - Configure vitest with `jsdom` environment for `src/`
    - Add tests for critical hooks (`useApps`, `useTheme`)
    - Add component tests for `AppForm` validation, `LogViewer`

17. **Add ESLint rules**
    - `eslint-plugin-jsx-a11y` for accessibility linting
    - Import ordering rules
    - Rule preventing Electron imports in renderer code

18. **Website improvements** (W4, W5)
    - Add lint + type-check to deploy workflow
    - Add `robots.txt`, sitemap, JSON-LD structured data

---

## Scorecard

| Area | Grade | Key Gap |
|------|-------|---------|
| Security | **D** | Command injection in shell calls; no IPC validation |
| Test Coverage | **F** | 8% file coverage; zero renderer tests; no coverage tooling |
| CI/CD | **D+** | Tests skip macOS; no tests before release |
| Error Handling | **C** | Silent data loss; swallowed exceptions |
| Performance | **B-** | 1s full-broadcast is wasteful; sync file I/O on main thread |
| React Code Quality | **B-** | Major hook duplication; minor anti-patterns |
| Accessibility | **D** | Minimal ARIA across both app and website |
| Types & Architecture | **B+** | Clean separation; needs discriminated unions |
| Dependencies | **A** | All current; no vulnerabilities |
| Documentation | **A** | CLAUDE.md is excellent |
| **Overall** | **C+** | Works well for a v1, but needs hardening for production/OSS adoption |
