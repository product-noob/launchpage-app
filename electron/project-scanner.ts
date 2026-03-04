import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { AppType, DiscoveredProject } from '../shared/types.ts'

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'venv', '.venv', 'env',
  '__pycache__', '.tox', '.mypy_cache', '.pytest_cache', 'dist',
  'build', '.next', '.nuxt', '.output', 'target', 'vendor',
  '.cache', '.parcel-cache', 'coverage', '.idea', '.vscode',
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

  for (const dir of directories) {
    await scanDir(dir, 0, results, visited, existingPaths)
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
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || results.length >= MAX_RESULTS) return

  let realPath: string
  try {
    realPath = fs.realpathSync(dirPath)
  } catch { return }

  if (visited.has(realPath)) return
  visited.add(realPath)

  const detection = detectProject(dirPath)
  if (detection && !existingPaths.has(realPath) && !existingPaths.has(dirPath)) {
    const dirName = path.basename(dirPath)
    const name = formatProjectName(dirName)
    results.push({
      id: dirName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
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
    await scanDir(sub, depth + 1, results, visited, existingPaths)
    if (results.length >= MAX_RESULTS) break
  }
}

function detectProject(dirPath: string): DetectionResult | null {
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

function detectFromPackageJson(dirPath: string): DetectionResult | null {
  const pkgPath = path.join(dirPath, 'package.json')
  if (!fs.existsSync(pkgPath)) return null

  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw)
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const scripts = pkg.scripts || {}

    if (deps['next']) return { type: 'nextjs', framework: 'Next.js', command: scripts.dev || 'npm run dev', port: 3000 }
    if (deps['nuxt'] || deps['nuxt3']) return { type: 'nuxt', framework: 'Nuxt', command: scripts.dev || 'npm run dev', port: 3000 }
    if (deps['astro']) return { type: 'astro', framework: 'Astro', command: scripts.dev || 'npm run dev', port: 4321 }
    if (deps['@remix-run/react'] || deps['@remix-run/dev']) return { type: 'remix', framework: 'Remix', command: scripts.dev || 'npm run dev', port: 5173 }
    if (deps['svelte'] || deps['@sveltejs/kit']) return { type: 'svelte', framework: 'SvelteKit', command: scripts.dev || 'npm run dev', port: 5173 }
    if (deps['vite']) return { type: 'vite', framework: 'Vite', command: scripts.dev || 'npm run dev', port: 5173 }
    if (deps['express']) return { type: 'express', framework: 'Express', command: scripts.start || scripts.dev || 'npm start', port: 3000 }
    if (deps['fastify']) return { type: 'express', framework: 'Fastify', command: scripts.start || scripts.dev || 'npm start', port: 3000 }
    if (deps['electron']) return null

    const devCmd = scripts.dev || scripts.start
    if (devCmd) return { type: 'node', framework: 'Node.js', command: scripts.dev ? 'npm run dev' : 'npm start', port: 3000 }

    return null
  } catch { return null }
}

function detectFromPyproject(dirPath: string): DetectionResult | null {
  const tomlPath = path.join(dirPath, 'pyproject.toml')
  if (!fs.existsSync(tomlPath)) return null

  try {
    const content = fs.readFileSync(tomlPath, 'utf-8')
    const lower = content.toLowerCase()

    if (lower.includes('streamlit')) {
      const mainFile = findPythonEntrypoint(dirPath, 'app.py', 'main.py', 'streamlit_app.py')
      return { type: 'streamlit', framework: 'Streamlit', command: `streamlit run ${mainFile}`, port: 8501 }
    }
    if (lower.includes('fastapi') || lower.includes('uvicorn')) {
      return { type: 'fastapi', framework: 'FastAPI', command: 'uvicorn main:app --reload', port: 8000 }
    }
    if (lower.includes('django')) {
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
      const mainFile = findPythonEntrypoint(dirPath, 'app.py', 'main.py', 'streamlit_app.py')
      return { type: 'streamlit', framework: 'Streamlit', command: `streamlit run ${mainFile}`, port: 8501 }
    }
    if (content.includes('fastapi') || content.includes('uvicorn')) {
      return { type: 'fastapi', framework: 'FastAPI', command: 'uvicorn main:app --reload', port: 8000 }
    }
    if (content.includes('django')) {
      return { type: 'django', framework: 'Django', command: 'python manage.py runserver', port: 8000 }
    }
    if (content.includes('flask')) {
      return { type: 'flask', framework: 'Flask', command: 'flask run', port: 5000 }
    }
    return null
  } catch { return null }
}

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
