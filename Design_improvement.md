# Launchpad -UX & Design Systems Audit

> Audit performed on the full codebase: every component, hook, stylesheet, and view.

---

## 1. Visual System & Design Consistency

### 1.1 Typography Scale: Fragmented and Ad Hoc

The codebase uses **9 distinct font sizes**, most via Tailwind arbitrary values, with no governing scale:

| Size | Usage |
|---|---|
| `text-[8px]` | AUTO badge, component type pills, tag chips |
| `text-[9px]` | Type pills, form labels, tag chips, Start/Stop All buttons, filter level buttons |
| `text-[10px]` | Section labels, port numbers, uptime, log search, hint text, stats bar counters |
| `text-[11px]` | Form fields, search inputs, buttons, log lines, menu items, most body text |
| `text-[12px]` | Primary CTA buttons, console log lines, config textarea |
| `text-[13px]` | App card name text |
| `text-xs` (12px) | Section headers, form headers, settings text |
| `text-sm` (14px) | Console table text, settings labels, section headers |
| `text-2xl` | Dashboard stat cards only |

This is not a type scale -it's a scatterplot. There are **five sizes between 8px and 12px**, each used for overlapping semantic purposes. The same conceptual element (a form label) appears at `text-[9px]` inside grouped form components and `text-[10px]` in the `Field` component. The same conceptual element (body text) is `text-[11px]` in the tray and `text-sm` in the console.

**Verdict**: The micro-typography (8–10px) optimizes for density in the tray, which is the right instinct for a 420px-wide menu bar popup. But the sizes are not rationalized, and the console window inherits tray-scale sizing rather than establishing its own appropriate scale.

### 1.2 Spacing System: Tailwind Defaults, Inconsistently Applied

Spacing uses Tailwind's default 4px grid, but rhythm varies across similar components:

- Card padding: `px-3 py-2` everywhere (consistent)
- Section spacing: `space-y-1.5` (app list), `space-y-2` (grouped components), `space-y-3` (forms), `space-y-6` (dashboard), `space-y-8` (settings) -five different vertical rhythms
- Gap values: `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5`, `gap-3` all appear in similar contexts (button groups, flex rows)
- Content padding: `px-3 py-2` (tray), `px-6 py-3` (console), `p-6` (dashboard) -reasonable bifurcation between tray and console

The spacing **within** each surface is consistent enough, but there's no documented spacing scale that governs when to use `gap-1.5` vs `gap-2`.

### 1.3 Color System: Dual System with Drift

Two color systems coexist:

**System 1**: Tailwind utility classes in components -`neutral-100` through `neutral-950`, semantic colors from Tailwind's palette (`emerald-400`, `sky-400`, `red-400/500`, `amber-400`).

**System 2**: Hardcoded hex values in `src/index.css` -`#404040` (neutral-700), `#525252` (neutral-600), `#c4c4c4` (≈ neutral-300 but not exact), `#171717` (neutral-900), `#e5e5e5` (neutral-200), `#0ea5e9` (sky-500), `#34d399` (emerald-400), `#f87171` (red-400).

The `.btn-action-start`, `.btn-action-stop`, `.btn-secondary`, and `.input-field` classes all use raw hex. These map to Tailwind values but aren't using them, creating a maintenance gap. If someone changes the color palette, they'd need to update both systems.

**The `typeRegistry.ts` is a bright spot** -it's a proper centralized token map for app-type colors. However, the **status colors** are defined three different ways:

1. `StatusBadge.tsx`: `bg-emerald-400`, `bg-amber-400`, `bg-red-500`, `bg-neutral-500`
2. `AppCard.tsx` border colors: `border-emerald-500/20 bg-emerald-500/5`, `border-red-500/30 bg-red-500/5`
3. `Toast.tsx`: `bg-emerald-900/90`, `bg-red-900/90`

Same semantic concept (running = green, error = red), three different color expressions, not connected through any shared token.

### 1.4 Iconography: Inline SVG Explosion

Every icon in the app is an inline SVG path string. There is **no icon component, no icon library, and no shared icon set**. The exact same SVG paths are duplicated across files:

- **Chevron-left** (back arrow): copied in `LogViewer.tsx`, `AddAppForm.tsx`, `EditAppForm.tsx`
- **Terminal icon**: copied in `AppCard.tsx`, `GroupedAppCard.tsx`, `AppsTab.tsx`, `LogViewer.tsx`, `LogsTab.tsx`
- **Trash/remove icon**: copied in `AppCard.tsx`, `GroupedAppCard.tsx`, `AppsTab.tsx`
- **Edit pencil icon**: copied in `AppCard.tsx`, `GroupedAppCard.tsx`, `AppsTab.tsx`
- **Restart icon**: copied in `AppCard.tsx`, `GroupedAppCard.tsx`, `AppsTab.tsx`
- **Ellipsis menu (three dots)**: copied 4 times
- **Search magnifying glass**: copied in `AppList.tsx`, `LogViewer.tsx`

Conservative estimate: **~40 inline SVG blocks** across the codebase, with most being duplicates of about 10–12 unique icons.

### 1.5 Theme Handling

The theme implementation works but has architectural issues:

- No `system` option (follow OS preference via `prefers-color-scheme`)
- Uses manual `.dark`/`.light` class toggling instead of Tailwind v4's built-in dark mode
- The custom variant `@custom-variant dark (&:where(.dark, .dark *))` works but adds CSS specificity complexity

### 1.6 Component Reuse: Severe Duplication

This is the most critical design system failure:

| Pattern | Files Duplicated In | ~LOC Wasted |
|---|---|---|
| `getAppStatus()` function | `useApps.ts`, `DashboardTab.tsx`, `AppsTab.tsx` | 30 |
| `formatUptime()` function | `AppCard.tsx`, `AppsTab.tsx` | 14 |
| `getLineClass()` log coloring | `LogViewer.tsx`, `LogsTab.tsx` | 16 |
| Menu/overflow component | `AppCard.tsx` (MenuItem), `GroupedAppCard.tsx` (OverflowItem), `AppsTab.tsx` (MenuBtn) | 60 |
| Outside-click-to-close hook | `AppCard.tsx`, `GroupedAppCard.tsx`, `AppsTab.tsx` (RowMenu) | 30 |
| `Field` form wrapper | `AddAppForm.tsx`, `EditAppForm.tsx` | 12 |
| Entire form layout | `AddAppForm.tsx` vs `EditAppForm.tsx` | 150 |
| Apps + status fetching | `DashboardTab.tsx`, `AppsTab.tsx`, `LogsTab.tsx` | 45 |

**`AddAppForm.tsx` (327 LOC) and `EditAppForm.tsx` (301 LOC) are ~85% identical**. The grouped component editor sections are character-for-character the same. This is the single largest design system debt in the codebase.

---

## 2. Interaction Design & Usability

### 2.1 Navigation Model

The app has two surfaces with different navigation paradigms:

- **Tray window**: Stack navigation. `view` state switches between `'list'` | `'add'` | `'edit'` | `'logs'`. No animation. View changes are instant cuts with no spatial context.
- **Console window**: Tab navigation with a sidebar. Five tabs rendered conditionally (not lazy-loaded, not routed).

The tray navigation is simple and appropriate for a dropdown. But there's **no back gesture, no breadcrumb, and no animation** to convey spatial relationships. When you go from list → logs → back, the cognitive cost is low because the app is small, but it will degrade as views multiply.

### 2.2 State Feedback

**Good:**
- `StatusBadge` with `animate-ping` for "starting" state -clear, visible pulse
- Error messages shown inline on cards
- Toast notifications for action confirmation
- `pendingOps` tracking disables buttons during async operations
- Skeleton loading state on initial load

**Gaps:**
- No transition animation between views
- No loading spinner or feedback while IPC calls are in flight (e.g., removing an app)
- Toast auto-dismisses at 3s with no undo for destructive actions (remove)
- The "Scroll to bottom" button in `LogViewer` uses `absolute` positioning and can overlay log content
- No skeleton states for the console dashboard when loading

### 2.3 Form Usability

Issues in `AddAppForm` / `EditAppForm`:

1. No inline validation. The submit button is disabled when invalid, but the user gets **no feedback about what's missing**.
2. Port field accepts any number -no range validation (1–65535).
3. Tags are a comma-separated text input. Modern UX demands a token/chip input.
4. The "Multi-service app" checkbox fundamentally changes the form layout, but there's no visual transition or explanation of what changes.
5. No field-level error states (no red borders, no helper text).
6. The `Browse` button for path selection has no visual confirmation state after selection.

### 2.4 Empty and Error States

Empty states are **well-handled** in the tray -correctly distinguishes between "no apps at all" and "no matching apps" with icon + instructional text.

The console views, however, have minimal empty states -just plain text like "No apps found."

The error boundary exists and is functional but spartan. The "Try Again" action just clears the error state, which may not resolve the underlying issue.

### 2.5 Missing Affordances

1. **No keyboard shortcuts** for common actions (start/stop, navigate between apps) despite `reorderApps` IPC existing.
2. **No drag-to-reorder** even though the IPC handler for reordering exists.
3. **No right-click context menu** -would be natural for a desktop app.
4. **No confirmation on import** (overwrites config silently).
5. **The quit button** in the title bar uses a 12px power icon in neutral-400 -dangerously low visual weight for an action that kills all running processes.

---

## 3. User Flow & Conversion Psychology

### 3.1 Primary Journey Clarity

The primary journey is: **Open tray → See app statuses → Start/Stop apps → View logs if needed**.

This flow is well-supported. The app list is immediately visible, status is clearly communicated through color-coded dots and card borders, and the Start/Stop actions are the most prominent interactive elements on each card.

### 3.2 Activation Moment

The first-run experience is weak. A user who installs the app sees an empty list with "No apps configured yet" and a small "Add App" button at the bottom. There is:
- No onboarding wizard
- No auto-detection of running projects
- No suggested configurations
- No import from existing tools

The "Add App" form requires the user to know their app's path, command, type, and port. This is a cold start that filters out casual users.

### 3.3 CTA Hierarchy

In the tray, the action hierarchy is appropriate:
1. **Start/Stop** (24px colored buttons, always visible)
2. **Open in browser** (24px icon, shown when running)
3. **Overflow menu** (24px icon, contains secondary actions)

The "Add App" CTA in the footer is well-positioned but uses a dashed border + muted text -deliberately low-emphasis, which is correct for a secondary action but weak for the activation moment.

In the console, CTAs are less organized. The dashboard "Start All" / "Stop All" buttons and per-app Start/Stop buttons compete visually.

### 3.4 Decision Fatigue

The AddAppForm has a manageable number of fields for single apps (5 fields). The grouped app form is denser but uses progressive disclosure through the "Multi-service app" toggle. **This is well-designed.**

The type selector dropdown with 19 options is approaching the limit. Consider grouping (Frontend/Backend/DevOps) or auto-detection.

---

## 4. Scalability Assessment

### 4.1 Ready for 50+ screens?

**No.** The current architecture will not scale, for these specific reasons:

1. **No shared component library**: Every new view will re-implement buttons, menus, dropdowns, forms, and icons from scratch, as has already happened 3 times (tray, console dashboard, console apps table).

2. **No shared data layer for console**: Each console tab independently subscribes to status updates and fetches app lists. Adding a 6th tab means copy-pasting the same 15-line useEffect block a 4th time.

3. **View navigation is state-based, not route-based**: The tray's `useState<'list' | 'add' | 'logs' | 'edit'>` approach means every new view is a new conditional branch. At 10+ views, this becomes unreadable.

4. **No layout primitives**: There's no `<Card>`, `<Section>`, `<PageHeader>`, `<ActionBar>`, or `<DataTable>` component. Every layout is custom.

### 4.2 Where Will Design Debt Accumulate?

1. **Forms**: Adding grouped-app editing required duplicating the entire AddAppForm. Any new entity (environments, secrets, presets) will create more form duplication.
2. **Menus**: The overflow menu pattern has already been written 4 times. A popover menu primitive is urgently needed.
3. **Console tabs**: Each new tab will re-implement its own data fetching, and the state will diverge.
4. **Icons**: Each new icon needed will be another inline SVG path added somewhere.

---

## 5. Strengths

1. **Information density is excellent for the tray form factor**. The 420px popup packs a lot of utility into a small space without feeling cramped. The choice to use 9–13px text in the tray is the right call for a power-user tool.

2. **Status communication is immediate and clear**. Color-coded dots + card borders + port display + uptime -you know the state of every app at a glance. The `animate-ping` on "starting" is a particularly nice touch.

3. **`typeRegistry.ts` is the right pattern**. Centralizing app-type metadata in a lookup table is exactly what a design system needs. This should be expanded to cover all token categories.

4. **`StatusBadge` is a good primitive**. Small, focused, configuration-driven. This is the model to follow for all shared components.

5. **The two-surface architecture (tray + console) is smart**. Power users get the compact tray, management tasks get the full console. This separation of concerns is good product thinking.

6. **Toast notification system is functional and well-styled**. The slide-up animation, type-specific styling, and auto-dismiss are solid.

7. **Theme support exists and works**. Dark and light modes are implemented and the visual quality in both modes is acceptable.

8. **Accessibility basics are present**. Most interactive elements have `aria-label` and `title` attributes.

---

## 6. Categorized Weaknesses

### Visual Weaknesses

| Issue | Severity | Location |
|---|---|---|
| No design token system | Critical | Global |
| 9 font sizes with no governing scale | High | All components |
| Dual color system (hex in CSS + Tailwind in TSX) | High | `index.css` vs components |
| Status colors defined 3 different ways | Medium | `StatusBadge`, `AppCard`, `Toast` |
| No icon library -~40 inline SVGs | High | All components |
| Scrollbar colors hardcoded outside palette | Low | `index.css` |
| No "system" theme option | Low | `useTheme.ts` |

### Interaction Weaknesses

| Issue | Severity | Location |
|---|---|---|
| No view transition animations | Medium | `AppList.tsx` view switching |
| No inline form validation | High | `AddAppForm`, `EditAppForm` |
| No undo for destructive actions | Medium | Remove app flow |
| No keyboard shortcuts for common actions | Medium | Global |
| No drag-to-reorder (IPC exists, UI doesn't) | Low | `AppList.tsx` |
| Quit button has dangerously low visual weight | High | `App.tsx` title bar |
| No onboarding / first-run experience | Medium | Empty state |
| Tags input is raw text, not a chip input | Low | Forms |

### Systemic / Architecture Weaknesses

| Issue | Severity | Location |
|---|---|---|
| `AddAppForm` and `EditAppForm` are 85% identical | Critical | Both files |
| Menu component duplicated 4 times | High | `AppCard`, `GroupedAppCard`, `AppsTab` |
| `getAppStatus` function duplicated 3 times | High | `useApps`, `DashboardTab`, `AppsTab` |
| `getLineClass` duplicated in 2 log viewers | Medium | `LogViewer`, `LogsTab` |
| `formatUptime` duplicated in 2 files | Medium | `AppCard`, `AppsTab` |
| Console tabs each independently fetch all data | High | All console tabs |
| No shared layout primitives (`Card`, `PageHeader`, etc.) | High | Global |
| Outside-click logic duplicated 4 times | Medium | Menu components |
| No `useClickOutside` hook | Medium | Global |

---

## 7. Improvement Roadmap

### Phase 1: Foundation (Design Debt Remediation) -Week 1–2

**Goal**: Establish the design token layer and eliminate the worst duplication.

#### 1a. Create a design token file

Create `src/tokens.ts` (or Tailwind v4 CSS custom properties) with:

```typescript
export const typography = {
  caption:   'text-[10px]',   // Labels, hints, counters
  bodySm:    'text-[11px]',   // Default body, menus, inputs
  body:      'text-[12px]',   // Console body, log lines
  subtitle:  'text-[13px]',   // Card titles, names
  title:     'text-sm',       // Section headers (14px)
  display:   'text-2xl',      // Dashboard stat numbers
} as const

export const spacing = {
  cardPadding:     'px-3 py-2',
  sectionGap:      'space-y-1.5',
  formGap:         'space-y-3',
  consolePadding:  'px-6 py-3',
  pageGap:         'space-y-6',
} as const

export const statusColors = {
  stopped:  { dot: 'bg-neutral-500',  border: 'border-neutral-200 dark:border-neutral-800', bg: 'bg-neutral-50 dark:bg-neutral-900/50' },
  starting: { dot: 'bg-amber-400',    border: 'border-amber-500/20',  bg: 'bg-amber-500/5' },
  running:  { dot: 'bg-emerald-400',  border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  error:    { dot: 'bg-red-500',      border: 'border-red-500/30',    bg: 'bg-red-500/5' },
} as const

export const radius = {
  sm:   'rounded',        // Small pills, tags
  md:   'rounded-md',     // Inputs, buttons
  lg:   'rounded-lg',     // Cards, menus, dialogs
  xl:   'rounded-xl',     // Stat cards, window
  full: 'rounded-full',   // Badges, scroll-to-bottom
} as const

export const elevation = {
  menu:   'shadow-lg',
  dialog: 'shadow-xl',
  toast:  'shadow-lg',
} as const

export const motion = {
  fast:      'transition-colors duration-150',
  normal:    'transition-all duration-200',
  entrance:  'animate-[slideUp_0.2s_ease-out]',
} as const
```

#### 1b. Unify AddAppForm and EditAppForm

Merge into a single `AppForm` component with an `initialValues` prop and `mode: 'add' | 'edit'`. This eliminates ~250 lines of duplication.

#### 1c. Extract shared primitives

- `src/components/OverflowMenu.tsx` -reusable popover menu with `useClickOutside` hook
- `src/components/Icon.tsx` -`<Icon name="restart" />` wrapping all SVG paths in a static map
- `src/components/Field.tsx` -promote the locally-defined `Field` to a shared component
- `src/utils.ts` -move `getAppStatus`, `formatUptime`, `getLineClass` here

#### 1d. Consolidate CSS hex values

Replace all raw hex in `src/index.css` with Tailwind v4 CSS custom properties tied to the neutral palette.

---

### Phase 2: Interaction Quality -Week 3–4

**Goal**: Raise the interaction polish to native-app standards.

#### 2a. Add view transition animations

Slide-in-from-right for drill-down (list → logs, list → add), slide-out-left for back. Use CSS transitions or a lightweight library like `framer-motion`.

#### 2b. Add inline form validation

- Field-level error states with red borders and helper text
- Port range validation (1–65535)
- Real-time feedback on required fields
- Visual confirmation after folder selection

#### 2c. Add keyboard shortcuts

- `Cmd+K` / `Ctrl+K` for search focus
- `Escape` for back navigation
- Up/Down arrows for app list navigation
- `Enter` to start/stop focused app

#### 2d. Redesign the quit button

Either move to a menu, give it a text label, or increase its visual weight with a distinct color/size.

---

### Phase 3: Shared Data Layer -Week 5–6

**Goal**: Eliminate console-wide data duplication and prepare for new tabs.

#### 3a. Create a `ConsoleDataProvider`

React context that wraps all console tabs, providing shared `apps`, `statuses`, and action handlers. Eliminate the 3× data fetching duplication across `DashboardTab`, `AppsTab`, and `LogsTab`.

#### 3b. Add route-based navigation for the console

Even hash-based routing will improve deep-linking, back-button support, and code organization.

---

### Phase 4: Polish & Delight -Week 7–8

**Goal**: Close the gap between "functional tool" and "product people recommend."

#### 4a. Replace inline SVGs

Build a lightweight `<Icon>` component with a static map of all ~12 unique icons. Remove ~40 inline SVG blocks.

#### 4b. Add a first-run experience

- Auto-detect projects in common directories (`~/Developer`, `~/Projects`, etc.)
- Suggest configurations based on detected `package.json`, `pyproject.toml`, `Dockerfile`, etc.
- Offer a quick-import from an existing `apps.json`

#### 4c. Add `system` theme option

Use `prefers-color-scheme` media query to follow the OS preference. Three-way toggle: Dark / Light / System.

#### 4d. Implement drag-to-reorder

The `reorderApps` IPC already exists. Wire up a drag handle on cards using a library like `@dnd-kit/core`.

#### 4e. Add undo for destructive actions

Replace the immediate delete + toast with a "Removed -Undo" toast that delays actual deletion by 5 seconds.

---

## 8. Future Vision

With disciplined UX execution, Launchpad has the potential to become **the iTerm of local development orchestration** -the one tool every developer keeps in their menu bar, not because they have to, but because it makes their workflow feel effortless.

The product direction is right: a dense, fast, always-available menu bar tool for the 80% case (start/stop/check status), with a full console window for the 20% case (monitoring, configuration, debugging). This is the same pattern that made tools like Docker Desktop, TablePlus, and Raycast successful.

What's holding it back is **visual system maturity**, not product vision. The current codebase has the right instincts -`StatusBadge` as a primitive, `typeRegistry` as a token store, the tray/console split -but these patterns are islands in a sea of ad hoc implementation. The next evolution is connecting those islands into a coherent system:

- A token layer that makes consistency the path of least resistance
- A component library where building a new view means composing existing primitives, not writing new CSS
- A shared data layer where adding a console tab is 50 lines, not 200
- Animations and micro-interactions that make the app feel native-quality, matching the polish of macOS system utilities

The density and utility are already there. The foundations of taste are visible. What's needed now is the **engineering discipline to turn instincts into infrastructure** -so that the 20th screen you build is as consistent as the 2nd.
