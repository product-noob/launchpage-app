import { motion } from 'motion/react';
import { FolderSearch, Layers, Command, Terminal as TerminalIcon, LogIn, Zap } from 'lucide-react';

const features = [
  {
    icon: FolderSearch,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    title: 'Auto-scan your projects',
    description: 'Point Launchpad at a folder and it finds every Vite, Next.js, FastAPI, Django, or Streamlit app automatically. No config files, no manual entry.',
    visual: (
      <div className="mt-5 font-mono text-xs text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 rounded-lg p-3 border border-black/5 dark:border-white/5">
        <div className="text-gray-400 dark:text-gray-500 mb-1.5">~/projects</div>
        {[['dashboard', 'VITE', 'text-emerald-500'], ['api-server', 'FASTAPI', 'text-blue-500'], ['analytics', 'STREAMLIT', 'text-purple-500']].map(([name, type, cls]) => (
          <div key={name} className="flex items-center gap-2 py-0.5">
            <span className="text-gray-300 dark:text-gray-600">├─</span>
            <span>{name}</span>
            <span className={`text-[10px] font-bold ${cls}`}>{type}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Layers,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    title: 'Full-stack apps, one button',
    description: 'Group your frontend, backend, and database into a single app entry. One click starts everything. One click stops it all.',
    visual: (
      <div className="mt-5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-3 text-xs font-mono">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-800 dark:text-gray-200">My SaaS App</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">2 SERVICES</span>
        </div>
        {[['Frontend', ':5173', 'emerald'], ['Backend', ':8000', 'blue']].map(([svc, port, c]) => (
          <div key={svc} className="flex items-center gap-2 py-0.5 text-gray-500 dark:text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full bg-${c}-500 shrink-0`} />
            <span>{svc}</span>
            <span className="ml-auto text-gray-400">{port}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Command,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    title: 'One keystroke away',
    description: '⌘⇧L summons Launchpad from anywhere. Over your browser, your editor, your Figma. No window switching, no broken flow.',
    visual: (
      <div className="mt-5 flex items-center gap-2">
        {['⌘', '⇧', 'L'].map((k) => (
          <div key={k} className="w-10 h-10 rounded-lg bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center text-lg font-semibold text-gray-800 dark:text-gray-200">
            {k}
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-1">from anywhere</span>
      </div>
    ),
  },
  {
    icon: TerminalIcon,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    title: 'Live logs, no terminal needed',
    description: 'Stream stdout and stderr from every running server in one place. Color-coded, per-app, always a click away.',
    visual: (
      <div className="mt-5 bg-black/90 rounded-lg p-3 font-mono text-xs border border-white/10 space-y-1">
        <div className="text-green-400">✓ Server ready on :8000</div>
        <div className="text-yellow-400">⚠ Reloading module...</div>
        <div className="text-blue-400">→ GET /api/users 200 12ms</div>
        <div className="text-gray-500">→ GET /api/health 200 1ms</div>
      </div>
    ),
  },
  {
    icon: LogIn,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    title: 'Running before you open your editor',
    description: 'Enable auto-start and your dev servers boot when you log in. By the time your IDE loads, your stack is already live.',
    visual: (
      <div className="mt-5 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">3 servers running</span>
        </div>
        <span className="text-xs text-gray-400">logged in 2s ago</span>
      </div>
    ),
  },
  {
    icon: Zap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    title: 'Handles the setup for you',
    description: 'Auto-detects Python virtualenvs, finds a free port, identifies the framework. Works with your project as-is.',
    visual: (
      <div className="mt-5 space-y-1.5 font-mono text-xs text-gray-500 dark:text-gray-400">
        {['venv detected → ./venv/bin', 'port 8000 → free', 'framework → FastAPI'].map((line) => (
          <div key={line} className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export function BentoGrid() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto w-full">
      <div className="mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4"
        >
          The control panel your dev stack deserves
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto"
        >
          For PMs prototyping and vibe coders shipping — not for people who enjoy babysitting terminal windows.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/[0.04] transition-colors flex flex-col"
          >
            <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 shrink-0`}>
              <f.icon className={`w-5 h-5 ${f.color}`} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.description}</p>
            {f.visual}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
