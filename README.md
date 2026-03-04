# Launchpad

A menu bar / system tray app for launching, managing, and monitoring your local development servers from a single icon — on **macOS** and **Windows**.

Start your Vite frontends, FastAPI backends, Streamlit dashboards, and any other dev server — all from one place. No more juggling terminal tabs.

<!-- TODO: Add screenshot/GIF here -->
<!-- ![Launchpad screenshot](docs/screenshot.png) -->

## Features

- **Menu bar / tray app** — lives in your macOS menu bar or Windows system tray, always one click away
- **Start/stop/restart** any dev server with one click
- **Grouped apps** — manage multi-service projects (e.g. frontend + backend) as a single unit
- **Live logs** — stream stdout/stderr with color-coded output, search, and auto-scroll
- **Port detection** — automatically finds free ports and shows the running URL
- **Python venv detection** — auto-activates `venv/`, `.venv/`, or `env/` if found
- **Console window** — full dashboard with app metrics (CPU/memory), sortable table, config editor
- **Auto-start** — flag apps to launch automatically when Launchpad starts
- **Dark/light theme** — follows your system preference
- **Global shortcut** — `Cmd+Shift+L` (macOS) / `Ctrl+Shift+L` (Windows) to toggle from anywhere

## Install

### macOS — one-liner

```bash
curl -fsSL https://raw.githubusercontent.com/product-noob/launchpage-app/main/install.sh | bash
```

Downloads the latest universal DMG, installs to `/Applications`, and clears the quarantine flag so Gatekeeper doesn't block the first launch.

### macOS — Homebrew

```bash
brew install --cask product-noob/tap/launchpad
```

### Windows — one-liner (PowerShell)

```powershell
irm https://raw.githubusercontent.com/product-noob/launchpage-app/main/install.ps1 | iex
```

Downloads the latest NSIS installer and runs it silently. The app will appear in your Start Menu.

### Manual download

Download the latest release for your platform from [GitHub Releases](https://github.com/product-noob/launchpage-app/releases):

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `Launchpad-x.y.z-universal.dmg` |
| Windows x64 | `Launchpad Setup x.y.z.exe` |

> **macOS note:** If macOS shows a security warning, right-click the app and select "Open", or run:
> ```bash
> xattr -cr /Applications/Launchpad.app
> ```

## Build from Source

Requires Node.js 18+ and npm.

```bash
git clone https://github.com/product-noob/launchpage-app.git
cd launchpage-app
npm install
npm run dev        # Start dev server with HMR + Electron
```

### Other commands

```bash
npm run build          # Compile TypeScript + bundle with Vite
npm run package        # Build + create macOS universal DMG
npm run package:win    # Build + create Windows NSIS installer
npm run package:all    # Build both macOS and Windows
npm run lint           # Run ESLint
npm run test           # Run tests
```

## Adding Apps

1. Click the tray icon to open Launchpad
2. Click **"Add App"** at the bottom
3. Fill in the app name, path, start command, type, and port
4. Click **"Add App"** to save

For multi-service projects, toggle **"Multi-service app"** and add each service as a component.

Apps are stored in `apps.json` in your user data directory. See [`apps.example.json`](apps.example.json) for the format.

## Supported App Types

Vite, Streamlit, FastAPI, Astro, Node, Django, Flask, Express, Next.js, Nuxt, Remix, Svelte, Go, Rust, Ruby, Docker, Spring, Laravel, and a generic "other" type. Each gets its own color badge in the UI.

## Tech Stack

- **Electron 40** — cross-platform desktop shell
- **React 19** — renderer UI
- **Vite 7** — bundler with HMR
- **Tailwind CSS v4** — styling
- **TypeScript** — strict mode throughout

## Architecture

```
Renderer (React in BrowserWindow)
  ↕ window.electronAPI (contextBridge)
Preload (electron/preload.ts)
  ↕ ipcRenderer.invoke / ipcMain.handle
Main Process (electron/main.ts + process-manager.ts)
  ↕ electron/platform.ts  (cross-platform: spawn, kill, venv, terminal, metrics)
  ↕ child_process.spawn
Managed Apps (your dev servers)
```

Context isolation is enabled. The preload script exposes a typed API surface — no `nodeIntegration`.

## License

[MIT](LICENSE)
