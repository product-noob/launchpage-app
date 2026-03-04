import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import type { AppType, DiscoveredProject } from '../shared/types.ts'

// Phase 4: Expanded skip directories
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'venv', '.venv', 'env',
  '__pycache__', '.tox', '.mypy_cache', '.pytest_cache', 'dist',
  'build', '.next', '.nuxt', '.output', 'target', 'vendor',
  '.cache', '.parcel-cache', 'coverage', '.idea', '.vscode',
  '.turbo', '.nx', '.svelte-kit', '.vercel', '.netlify',
  '.angular', '.expo', '.gradle', 'out', 'bin', 'obj',
])

const MAX_SCAN_DEPTH = 3
const MAX_RESULTS = 200

const DEFAULT_SCAN_DIRS = [
  'Developer', 'Projects', 'Code', 'code', 'repos',
  'workspace', 'src', 'dev', 'Sites', 'projects',
]

interface DetectionResult {
  type: AppType
  framework: string
  command: string
  port?: number
}

// ── Phase 1: Package Manager & Command Helpers ────────────────────────────

/** Cache of which package manager binaries are available on the system */
const pmAvailableCache = new Map<string, boolean>()

function isPmAvailable(pm: string): boolean {
  if (pmAvailableCache.has(pm)) return pmAvailableCache.get(pm)!
  try {
    const cmd = process.platform === 'win32' ? `where ${pm}` : `which ${pm}`
    execSync(cmd, { stdio: 'ignore', timeout: 2000 })
    pmAvailableCache.set(pm, true)
    return true
  } catch {
    pmAvailableCache.set(pm, false)
    return false
  }
}

export function detectPackageManager(dirPath: string): string {
  if ((fs.existsSync(path.join(dirPath, 'bun.lockb')) || fs.existsSync(path.join(dirPath, 'bun.lock'))) && isPmAvailable('bun')) return 'bun'
  if (fs.existsSync(path.join(dirPath, 'pnpm-lock.yaml')) && isPmAvailable('pnpm')) return 'pnpm'
  if (fs.existsSync(path.join(dirPath, 'yarn.lock')) && isPmAvailable('yarn')) return 'yarn'
  return 'npm'
}

export function buildRunCommand(pm: string, scriptName: string): string {
  if (scriptName === 'start' && pm === 'npm') return 'npm start'
  return `${pm} run ${scriptName}`
}

// ── Phase 2: Smart Port Detection ─────────────────────────────────────────

export function extractPortFromScript(scriptBody: string): number | undefined {
  let match = scriptBody.match(/--port[= ](\d+)/)
  if (match) return parseInt(match[1], 10)

  match = scriptBody.match(/--server\.port[= ](\d+)/)
  if (match) return parseInt(match[1], 10)

  match = scriptBody.match(/(?:^|\s)-p\s+(\d+)/)
  if (match) return parseInt(match[1], 10)

  match = scriptBody.match(/\bPORT=(\d+)/)
  if (match) return parseInt(match[1], 10)

  return undefined
}

export function extractPortFromEnv(dirPath: string): number | undefined {
  const envFiles = ['.env', '.env.local', '.env.development']
  for (const envFile of envFiles) {
    const envPath = path.join(dirPath, envFile)
    try {
      if (!fs.existsSync(envPath)) continue
      const content = fs.readFileSync(envPath, 'utf-8')
      const match = content.match(/^\s*PORT\s*=\s*(\d+)/m)
      if (match) return parseInt(match[1], 10)
    } catch { /* ignore */ }
  }
  return undefined
}

/** Extract port from framework config files (vite.config.ts, next.config.js, etc.) */
export function extractPortFromConfig(dirPath: string): number | undefined {
  const configFiles = [
    'vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs',
    'next.config.ts', 'next.config.js', 'next.config.mjs',
    'nuxt.config.ts', 'nuxt.config.js',
    'astro.config.ts', 'astro.config.mjs',
  ]
  for (const configFile of configFiles) {
    const configPath = path.join(dirPath, configFile)
    try {
      if (!fs.existsSync(configPath)) continue
      const content = fs.readFileSync(configPath, 'utf-8')
      // Match port: 8080 or port: 3000 (with optional quotes/whitespace)
      const match = content.match(/\bport\s*:\s*(\d+)/)
      if (match) return parseInt(match[1], 10)
    } catch { /* ignore */ }
  }
  return undefined
}

// ── Phase 3: Python Detection Helpers ─────────────────────────────────────

export function detectFastAPIModule(dirPath: string): { module: string; variable: string } | null {
  const candidates = [
    { file: 'main.py', module: 'main' },
    { file: 'app.py', module: 'app' },
    { file: path.join('app', 'main.py'), module: 'app.main' },
    { file: path.join('src', 'main.py'), module: 'src.main' },
  ]

  for (const { file, module } of candidates) {
    const filePath = path.join(dirPath, file)
    try {
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/(\w+)\s*=\s*FastAPI\s*\(/)
      if (match) return { module, variable: match[1] }
    } catch { /* ignore */ }
  }
  return null
}

// ── Phase 4: Workspace Detection ──────────────────────────────────────────

export function detectWorkspaces(dirPath: string): string[] | null {
  // npm/yarn workspaces
  const pkgPath = path.join(dirPath, 'package.json')
  try {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const patterns = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : pkg.workspaces?.packages
      if (Array.isArray(patterns) && patterns.length > 0) {
        const resolved = resolveWorkspaceGlobs(dirPath, patterns)
        if (resolved.length > 0) return resolved
      }
    }
  } catch { /* ignore */ }

  // pnpm workspaces
  const pnpmPath = path.join(dirPath, 'pnpm-workspace.yaml')
  try {
    if (fs.existsSync(pnpmPath)) {
      const content = fs.readFileSync(pnpmPath, 'utf-8')
      const blockMatch = content.match(/packages:\s*\n((?:\s*-\s*.+\n?)*)/m)
      if (blockMatch) {
        const patterns = blockMatch[1]
          .split('\n')
          .map(line => line.replace(/^\s*-\s*['"]?/, '').replace(/['"]?\s*$/, ''))
          .filter(Boolean)
        const resolved = resolveWorkspaceGlobs(dirPath, patterns)
        if (resolved.length > 0) return resolved
      }
    }
  } catch { /* ignore */ }

  return null
}

function resolveWorkspaceGlobs(rootDir: string, patterns: string[]): string[] {
  const results: string[] = []
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const baseDir = path.join(rootDir, pattern.slice(0, -2))
      try {
        if (!fs.existsSync(baseDir)) continue
        const entries = fs.readdirSync(baseDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            results.push(path.join(baseDir, entry.name))
          }
        }
      } catch { /* ignore */ }
    } else {
      const resolved = path.join(rootDir, pattern)
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          results.push(resolved)
        }
      } catch { /* ignore */ }
    }
  }
  return results
}

// ── Phase 5: ID Generation ────────────────────────────────────────────────

function generateProjectId(dirPath: string, seenIds: Set<string>): string {
  const dirName = path.basename(dirPath)
  const parentName = path.basename(path.dirname(dirPath))
  const baseId = `${parentName}-${dirName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  if (!seenIds.has(baseId)) {
    seenIds.add(baseId)
    return baseId
  }

  let suffix = 2
  while (seenIds.has(`${baseId}-${suffix}`)) suffix++
  const uniqueId = `${baseId}-${suffix}`
  seenIds.add(uniqueId)
  return uniqueId
}

// ── Core Scanner ──────────────────────────────────────────────────────────

export function getDefaultScanDirectories(): string[] {
  const home = os.homedir()
  return DEFAULT_SCAN_DIRS
    .map(d => path.join(home, d))
    .filter(d => {
      try { return fs.statSync(d).isDirectory() } catch { return false }
    })
}

export async function scanDirectories(
  directories: string[],
  existingPaths: Set<string>,
): Promise<DiscoveredProject[]> {
  const results: DiscoveredProject[] = []
  const visited = new Set<string>()
  const seenIds = new Set<string>()

  for (const dir of directories) {
    await scanDir(dir, 0, results, visited, existingPaths, seenIds)
    if (results.length >= MAX_RESULTS) break
  }

  results.sort((a, b) => a.name.localeCompare(b.name))
  return results
}

async function scanDir(
  dirPath: string,
  depth: number,
  results: DiscoveredProject[],
  visited: Set<string>,
  existingPaths: Set<string>,
  seenIds: Set<string>,
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || results.length >= MAX_RESULTS) return

  let realPath: string
  try {
    realPath = fs.realpathSync(dirPath)
  } catch { return }

  if (visited.has(realPath)) return
  visited.add(realPath)

  // Phase 4: Check for workspace root — scan packages instead of root
  const workspacePkgs = detectWorkspaces(dirPath)
  if (workspacePkgs) {
    for (const pkgDir of workspacePkgs) {
      await scanDir(pkgDir, depth + 1, results, visited, existingPaths, seenIds)
      if (results.length >= MAX_RESULTS) break
    }
    return
  }

  const detection = detectProject(dirPath)
  if (detection && !existingPaths.has(realPath) && !existingPaths.has(dirPath)) {
    const name = formatProjectName(path.basename(dirPath))
    results.push({
      id: generateProjectId(dirPath, seenIds),
      name,
      path: dirPath,
      type: detection.type,
      command: detection.command,
      port: detection.port,
      framework: detection.framework,
    })
    return
  }

  if (depth >= MAX_SCAN_DEPTH) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch { return }

  const subdirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
    .map(e => path.join(dirPath, e.name))

  for (const sub of subdirs) {
    await scanDir(sub, depth + 1, results, visited, existingPaths, seenIds)
    if (results.length >= MAX_RESULTS) break
  }
}

// Phase 5: Export detectProject for testability
export function detectProject(dirPath: string): DetectionResult | null {
  return detectFromPackageJson(dirPath)
    || detectFromPyproject(dirPath)
    || detectFromRequirements(dirPath)
    || detectFromCargoToml(dirPath)
    || detectFromGoMod(dirPath)
    || detectFromGemfile(dirPath)
    || detectFromDocker(dirPath)
    || detectFromJava(dirPath)
    || detectFromComposer(dirPath)
    || null
}

// ── Phase 1+2: Fixed PackageJson Detection ────────────────────────────────

function detectFromPackageJson(dirPath: string): DetectionResult | null {
  const pkgPath = path.join(dirPath, 'package.json')
  if (!fs.existsSync(pkgPath)) return null

  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw)
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const scripts = pkg.scripts || {}
    const pm = detectPackageManager(dirPath)

    const hasDevScript = !!scripts.dev
    const hasStartScript = !!scripts.start
    const devScriptBody = scripts.dev || ''
    const startScriptBody = scripts.start || ''

    // Phase 2: port priority — script body > .env > config file > framework default
    const scriptPort = hasDevScript
      ? extractPortFromScript(devScriptBody)
      : hasStartScript
        ? extractPortFromScript(startScriptBody)
        : undefined
    const envPort = extractPortFromEnv(dirPath)
    const configPort = extractPortFromConfig(dirPath)

    function resolvePort(frameworkDefault: number): number {
      return scriptPort ?? envPort ?? configPort ?? frameworkDefault
    }

    function devCommand(): string {
      return hasDevScript ? buildRunCommand(pm, 'dev') : `${pm} run dev`
    }

    function startOrDevCommand(): string {
      if (hasStartScript) return buildRunCommand(pm, 'start')
      if (hasDevScript) return buildRunCommand(pm, 'dev')
      return `${pm} start`
    }

    if (deps['next']) return { type: 'nextjs', framework: 'Next.js', command: devCommand(), port: resolvePort(3000) }
    if (deps['nuxt'] || deps['nuxt3']) return { type: 'nuxt', framework: 'Nuxt', command: devCommand(), port: resolvePort(3000) }
    if (deps['astro']) return { type: 'astro', framework: 'Astro', command: devCommand(), port: resolvePort(4321) }
    if (deps['@remix-run/react'] || deps['@remix-run/dev']) return { type: 'remix', framework: 'Remix', command: devCommand(), port: resolvePort(5173) }
    if (deps['svelte'] || deps['@sveltejs/kit']) return { type: 'svelte', framework: 'SvelteKit', command: devCommand(), port: resolvePort(5173) }
    if (deps['vite']) return { type: 'vite', framework: 'Vite', command: devCommand(), port: resolvePort(5173) }
    if (deps['express']) return { type: 'express', framework: 'Express', command: startOrDevCommand(), port: resolvePort(3000) }
    if (deps['fastify']) return { type: 'express', framework: 'Fastify', command: startOrDevCommand(), port: resolvePort(3000) }
    if (deps['electron']) return null

    const devCmd = scripts.dev || scripts.start
    if (devCmd) {
      return {
        type: 'node',
        framework: 'Node.js',
        command: hasDevScript ? buildRunCommand(pm, 'dev') : buildRunCommand(pm, 'start'),
        port: resolvePort(3000),
      }
    }

    return null
  } catch { return null }
}

// ── Phase 3: Python Detection ─────────────────────────────────────────────

function detectFromPyproject(dirPath: string): DetectionResult | null {
  const tomlPath = path.join(dirPath, 'pyproject.toml')
  if (!fs.existsSync(tomlPath)) return null

  try {
    const content = fs.readFileSync(tomlPath, 'utf-8')
    const lower = content.toLowerCase()

    if (lower.includes('streamlit')) {
      const mainFile = findPythonEntrypoint(dirPath, 'app.py', 'main.py', 'streamlit_app.py', 'dashboard.py', 'Home.py')
      return { type: 'streamlit', framework: 'Streamlit', command: `streamlit run ${mainFile}`, port: 8501 }
    }
    if (lower.includes('fastapi') || lower.includes('uvicorn')) {
      const fastapi = detectFastAPIModule(dirPath)
      if (fastapi) {
        return { type: 'fastapi', framework: 'FastAPI', command: `uvicorn ${fastapi.module}:${fastapi.variable} --reload`, port: 8000 }
      }
      return { type: 'fastapi', framework: 'FastAPI', command: 'uvicorn main:app --reload', port: 8000 }
    }
    if (lower.includes('django')) {
      if (!fs.existsSync(path.join(dirPath, 'manage.py'))) return null
      return { type: 'django', framework: 'Django', command: 'python manage.py runserver', port: 8000 }
    }
    if (lower.includes('flask')) {
      return { type: 'flask', framework: 'Flask', command: 'flask run', port: 5000 }
    }
    return { type: 'other', framework: 'Python', command: 'python main.py' }
  } catch { return null }
}

function detectFromRequirements(dirPath: string): DetectionResult | null {
  const reqPath = path.join(dirPath, 'requirements.txt')
  if (!fs.existsSync(reqPath)) return null

  if (fs.existsSync(path.join(dirPath, 'pyproject.toml'))) return null

  try {
    const content = fs.readFileSync(reqPath, 'utf-8').toLowerCase()

    if (content.includes('streamlit')) {
      const mainFile = findPythonEntrypoint(dirPath, 'app.py', 'main.py', 'streamlit_app.py', 'dashboard.py', 'Home.py')
      return { type: 'streamlit', framework: 'Streamlit', command: `streamlit run ${mainFile}`, port: 8501 }
    }
    if (content.includes('fastapi') || content.includes('uvicorn')) {
      const fastapi = detectFastAPIModule(dirPath)
      if (fastapi) {
        return { type: 'fastapi', framework: 'FastAPI', command: `uvicorn ${fastapi.module}:${fastapi.variable} --reload`, port: 8000 }
      }
      return { type: 'fastapi', framework: 'FastAPI', command: 'uvicorn main:app --reload', port: 8000 }
    }
    if (content.includes('django')) {
      if (!fs.existsSync(path.join(dirPath, 'manage.py'))) return null
      return { type: 'django', framework: 'Django', command: 'python manage.py runserver', port: 8000 }
    }
    if (content.includes('flask')) {
      return { type: 'flask', framework: 'Flask', command: 'flask run', port: 5000 }
    }
    return null
  } catch { return null }
}

// ── Remaining detectors (unchanged) ───────────────────────────────────────

function detectFromCargoToml(dirPath: string): DetectionResult | null {
  if (!fs.existsSync(path.join(dirPath, 'Cargo.toml'))) return null
  return { type: 'rust', framework: 'Rust', command: 'cargo run' }
}

function detectFromGoMod(dirPath: string): DetectionResult | null {
  if (!fs.existsSync(path.join(dirPath, 'go.mod'))) return null
  return { type: 'go', framework: 'Go', command: 'go run .' }
}

function detectFromGemfile(dirPath: string): DetectionResult | null {
  if (!fs.existsSync(path.join(dirPath, 'Gemfile'))) return null
  if (fs.existsSync(path.join(dirPath, 'config.ru'))) {
    return { type: 'ruby', framework: 'Rails', command: 'rails server', port: 3000 }
  }
  return { type: 'ruby', framework: 'Ruby', command: 'ruby main.rb' }
}

function detectFromDocker(dirPath: string): DetectionResult | null {
  const hasCompose = fs.existsSync(path.join(dirPath, 'docker-compose.yml'))
    || fs.existsSync(path.join(dirPath, 'docker-compose.yaml'))
    || fs.existsSync(path.join(dirPath, 'compose.yml'))
    || fs.existsSync(path.join(dirPath, 'compose.yaml'))
  if (!hasCompose) return null
  if (fs.existsSync(path.join(dirPath, 'package.json')) || fs.existsSync(path.join(dirPath, 'pyproject.toml'))) return null
  return { type: 'docker', framework: 'Docker Compose', command: 'docker compose up' }
}

function detectFromJava(dirPath: string): DetectionResult | null {
  if (fs.existsSync(path.join(dirPath, 'pom.xml'))
    || fs.existsSync(path.join(dirPath, 'build.gradle'))
    || fs.existsSync(path.join(dirPath, 'build.gradle.kts'))) {
    return { type: 'spring', framework: 'Spring/Java', command: process.platform === 'win32' ? 'mvnw.cmd spring-boot:run' : './mvnw spring-boot:run', port: 8080 }
  }
  return null
}

function detectFromComposer(dirPath: string): DetectionResult | null {
  if (!fs.existsSync(path.join(dirPath, 'composer.json'))) return null
  if (fs.existsSync(path.join(dirPath, 'artisan'))) {
    return { type: 'laravel', framework: 'Laravel', command: 'php artisan serve', port: 8000 }
  }
  return null
}

function findPythonEntrypoint(dirPath: string, ...candidates: string[]): string {
  for (const name of candidates) {
    if (fs.existsSync(path.join(dirPath, name))) return name
  }
  return candidates[0]
}

function formatProjectName(dirName: string): string {
  return dirName
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
