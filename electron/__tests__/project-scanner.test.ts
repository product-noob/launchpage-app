import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import {
    detectPackageManager,
    buildRunCommand,
    extractPortFromScript,
    extractPortFromEnv,
    extractPortFromConfig,
    detectFastAPIModule,
    detectWorkspaces,
    detectProject,
    scanDirectories,
} from '../project-scanner.ts'

/** Check if a package manager binary is available on this system */
function hasPm(pm: string): boolean {
    try {
        const cmd = process.platform === 'win32' ? `where ${pm}` : `which ${pm}`
        execSync(cmd, { stdio: 'ignore', timeout: 2000 })
        return true
    } catch { return false }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-test-'))
}

function rmDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true })
}

function writePkgJson(dir: string, pkg: Record<string, unknown>): void {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
}

// ── Phase 1: Package Manager Detection ──────────────────────────────────────

describe('detectPackageManager', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('returns npm when no lockfile exists', () => {
        tmpDir = makeTmpDir()
        expect(detectPackageManager(tmpDir)).toBe('npm')
    })

    it('returns yarn when yarn.lock exists and yarn is installed', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '')
        expect(detectPackageManager(tmpDir)).toBe(hasPm('yarn') ? 'yarn' : 'npm')
    })

    it('returns pnpm when pnpm-lock.yaml exists and pnpm is installed', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '')
        expect(detectPackageManager(tmpDir)).toBe(hasPm('pnpm') ? 'pnpm' : 'npm')
    })

    it('returns bun when bun.lockb exists and bun is installed', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '')
        expect(detectPackageManager(tmpDir)).toBe(hasPm('bun') ? 'bun' : 'npm')
    })

    it('falls back to npm when lockfile PM is not installed', () => {
        tmpDir = makeTmpDir()
        // If bun isn't installed, bun.lockb should fall back to npm
        if (!hasPm('bun')) {
            fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '')
            expect(detectPackageManager(tmpDir)).toBe('npm')
        }
    })
})

describe('buildRunCommand', () => {
    it('returns "npm start" for npm + start', () => {
        expect(buildRunCommand('npm', 'start')).toBe('npm start')
    })

    it('returns "<pm> run dev" for dev script', () => {
        expect(buildRunCommand('npm', 'dev')).toBe('npm run dev')
        expect(buildRunCommand('yarn', 'dev')).toBe('yarn run dev')
        expect(buildRunCommand('pnpm', 'dev')).toBe('pnpm run dev')
        expect(buildRunCommand('bun', 'dev')).toBe('bun run dev')
    })

    it('returns "<pm> run start" for non-npm start', () => {
        expect(buildRunCommand('yarn', 'start')).toBe('yarn run start')
        expect(buildRunCommand('pnpm', 'start')).toBe('pnpm run start')
    })
})

// ── Phase 2: Port Extraction ────────────────────────────────────────────────

describe('extractPortFromScript', () => {
    it('extracts --port 3000', () => {
        expect(extractPortFromScript('vite --port 3000 --host')).toBe(3000)
    })

    it('extracts --port=3000', () => {
        expect(extractPortFromScript('vite --port=3000')).toBe(3000)
    })

    it('extracts --server.port 8080', () => {
        expect(extractPortFromScript('streamlit run app.py --server.port 8080')).toBe(8080)
    })

    it('extracts -p 4000', () => {
        expect(extractPortFromScript('next dev -p 4000')).toBe(4000)
    })

    it('extracts PORT=3000', () => {
        expect(extractPortFromScript('PORT=3000 node server.js')).toBe(3000)
    })

    it('returns undefined when no port found', () => {
        expect(extractPortFromScript('vite --host')).toBeUndefined()
    })
})

describe('extractPortFromEnv', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('reads PORT from .env', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=4567\n')
        expect(extractPortFromEnv(tmpDir)).toBe(4567)
    })

    it('reads PORT from .env.local', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, '.env.local'), 'PORT=9999\n')
        expect(extractPortFromEnv(tmpDir)).toBe(9999)
    })

    it('reads PORT from .env.development', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, '.env.development'), 'PORT=8888\n')
        expect(extractPortFromEnv(tmpDir)).toBe(8888)
    })

    it('prefers .env over .env.local', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=1111\n')
        fs.writeFileSync(path.join(tmpDir, '.env.local'), 'PORT=2222\n')
        expect(extractPortFromEnv(tmpDir)).toBe(1111)
    })

    it('returns undefined when no .env exists', () => {
        tmpDir = makeTmpDir()
        expect(extractPortFromEnv(tmpDir)).toBeUndefined()
    })
})

describe('extractPortFromConfig', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('reads port from vite.config.ts', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'vite.config.ts'),
            'export default { server: { host: "::", port: 8080 } }\n')
        expect(extractPortFromConfig(tmpDir)).toBe(8080)
    })

    it('reads port from next.config.js', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'next.config.js'),
            'module.exports = { devServer: { port: 4000 } }\n')
        expect(extractPortFromConfig(tmpDir)).toBe(4000)
    })

    it('returns undefined when no config file exists', () => {
        tmpDir = makeTmpDir()
        expect(extractPortFromConfig(tmpDir)).toBeUndefined()
    })
})

// ── Phase 1+2: Node.js Command Generation via detectProject ────────────────

describe('detectProject — Node.js command generation', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('Vite project with raw script body uses npm run dev, extracts port', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite --port 3000 --host 0.0.0.0' },
        })
        const result = detectProject(tmpDir)
        expect(result).not.toBeNull()
        expect(result!.command).toBe('npm run dev')
        expect(result!.port).toBe(3000)
    })

    it('Vite project with yarn.lock uses yarn run dev if yarn installed', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite --port 3000' },
        })
        fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '')
        const result = detectProject(tmpDir)
        expect(result!.command).toBe(hasPm('yarn') ? 'yarn run dev' : 'npm run dev')
    })

    it('Vite project with pnpm-lock.yaml uses pnpm run dev if pnpm installed', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '')
        const result = detectProject(tmpDir)
        expect(result!.command).toBe(hasPm('pnpm') ? 'pnpm run dev' : 'npm run dev')
    })

    it('Vite project with bun.lockb uses bun run dev if bun installed, else npm', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '')
        const result = detectProject(tmpDir)
        expect(result!.command).toBe(hasPm('bun') ? 'bun run dev' : 'npm run dev')
    })

    it('Project with only scripts.start uses npm start', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            scripts: { start: 'node server.js' },
        })
        const result = detectProject(tmpDir)
        expect(result).not.toBeNull()
        expect(result!.command).toBe('npm start')
    })

    it('Express project uses start script command', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            dependencies: { express: '^4.0.0' },
            scripts: { start: 'node index.js', dev: 'nodemon index.js' },
        })
        const result = detectProject(tmpDir)
        expect(result!.command).toBe('npm start')
        expect(result!.framework).toBe('Express')
    })

    it('Port from .env is picked up when no port in script', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=4567\n')
        const result = detectProject(tmpDir)
        expect(result!.port).toBe(4567)
    })

    it('Port from script takes priority over .env', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite --port 3000' },
        })
        fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=4567\n')
        const result = detectProject(tmpDir)
        expect(result!.port).toBe(3000)
    })

    it('Port from vite.config.ts is picked up', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        fs.writeFileSync(path.join(tmpDir, 'vite.config.ts'),
            'export default { server: { port: 8080 } }\n')
        const result = detectProject(tmpDir)
        expect(result!.port).toBe(8080)
    })

    it('Port from .env takes priority over config file', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=9999\n')
        fs.writeFileSync(path.join(tmpDir, 'vite.config.ts'),
            'export default { server: { port: 8080 } }\n')
        const result = detectProject(tmpDir)
        expect(result!.port).toBe(9999)
    })
})

// ── Phase 3: FastAPI Module Detection ───────────────────────────────────────

describe('detectFastAPIModule', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('detects FastAPI in main.py', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'main.py'), 'from fastapi import FastAPI\napp = FastAPI()\n')
        const result = detectFastAPIModule(tmpDir)
        expect(result).toEqual({ module: 'main', variable: 'app' })
    })

    it('detects FastAPI in app/main.py with custom variable', () => {
        tmpDir = makeTmpDir()
        fs.mkdirSync(path.join(tmpDir, 'app'))
        fs.writeFileSync(path.join(tmpDir, 'app', 'main.py'), 'from fastapi import FastAPI\nserver = FastAPI()\n')
        const result = detectFastAPIModule(tmpDir)
        expect(result).toEqual({ module: 'app.main', variable: 'server' })
    })

    it('returns null when no FastAPI() found', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'main.py'), 'print("hello")\n')
        expect(detectFastAPIModule(tmpDir)).toBeNull()
    })
})

describe('detectProject — Python improvements', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('FastAPI with app/main.py generates correct uvicorn command', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'fastapi\nuvicorn\n')
        fs.mkdirSync(path.join(tmpDir, 'app'))
        fs.writeFileSync(path.join(tmpDir, 'app', 'main.py'), 'from fastapi import FastAPI\nserver = FastAPI()\n')
        const result = detectProject(tmpDir)
        expect(result).not.toBeNull()
        expect(result!.command).toBe('uvicorn app.main:server --reload')
    })

    it('Django project without manage.py is not detected', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django\n')
        const result = detectProject(tmpDir)
        expect(result).toBeNull()
    })

    it('Django project with manage.py is detected', () => {
        tmpDir = makeTmpDir()
        fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django\n')
        fs.writeFileSync(path.join(tmpDir, 'manage.py'), '#!/usr/bin/env python\n')
        const result = detectProject(tmpDir)
        expect(result).not.toBeNull()
        expect(result!.command).toBe('python manage.py runserver')
    })
})

// ── Phase 4: Workspace Detection ────────────────────────────────────────────

describe('detectWorkspaces', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('detects npm workspaces', () => {
        tmpDir = makeTmpDir()
        fs.mkdirSync(path.join(tmpDir, 'packages', 'app-a'), { recursive: true })
        fs.mkdirSync(path.join(tmpDir, 'packages', 'app-b'), { recursive: true })
        writePkgJson(tmpDir, { workspaces: ['packages/*'] })
        const result = detectWorkspaces(tmpDir)
        expect(result).not.toBeNull()
        expect(result!.length).toBe(2)
    })

    it('returns null for non-workspace projects', () => {
        tmpDir = makeTmpDir()
        writePkgJson(tmpDir, { name: 'simple' })
        expect(detectWorkspaces(tmpDir)).toBeNull()
    })
})

describe('scanDirectories — workspace packages scanned', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('scans workspace packages individually', async () => {
        tmpDir = makeTmpDir()
        const pkgsDir = path.join(tmpDir, 'packages')
        fs.mkdirSync(path.join(pkgsDir, 'web'), { recursive: true })
        fs.mkdirSync(path.join(pkgsDir, 'api'), { recursive: true })

        writePkgJson(tmpDir, { workspaces: ['packages/*'] })
        writePkgJson(path.join(pkgsDir, 'web'), {
            name: 'web',
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        writePkgJson(path.join(pkgsDir, 'api'), {
            name: 'api',
            dependencies: { express: '^4.0.0' },
            scripts: { start: 'node index.js' },
        })

        const results = await scanDirectories([tmpDir], new Set())
        expect(results.length).toBe(2)
        const frameworks = results.map(r => r.framework).sort()
        expect(frameworks).toContain('Vite')
        expect(frameworks).toContain('Express')
    })
})

// ── Phase 5: ID Generation ──────────────────────────────────────────────────

describe('ID generation — uniqueness', () => {
    let tmpDir: string
    afterEach(() => { if (tmpDir) rmDir(tmpDir) })

    it('two projects with same basename get unique IDs', async () => {
        tmpDir = makeTmpDir()
        const projA = path.join(tmpDir, 'proj-a', 'app')
        const projB = path.join(tmpDir, 'proj-b', 'app')
        fs.mkdirSync(projA, { recursive: true })
        fs.mkdirSync(projB, { recursive: true })

        writePkgJson(projA, {
            devDependencies: { vite: '^5.0.0' },
            scripts: { dev: 'vite' },
        })
        writePkgJson(projB, {
            dependencies: { express: '^4.0.0' },
            scripts: { start: 'node index.js' },
        })

        const results = await scanDirectories([tmpDir], new Set())
        expect(results.length).toBe(2)
        const ids = results.map(r => r.id)
        expect(new Set(ids).size).toBe(2) // all IDs unique
    })
})
