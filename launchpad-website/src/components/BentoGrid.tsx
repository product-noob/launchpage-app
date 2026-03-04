import { motion } from 'motion/react';
import { getOSInfo } from '../constants';

export function BentoGrid() {
  const { isMac } = getOSInfo();
  const keys = isMac ? ['⌘', '⇧', 'L'] : ['Ctrl', 'Shift', 'L'];

  return (
    <section id="features" className="py-24 px-6 max-w-5xl mx-auto w-full scroll-mt-20">
      <div className="mb-14 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3"
        >
          Everything you need. Nothing you don't.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-gray-500 dark:text-gray-400 max-w-md mx-auto"
        >
          Built for people who build apps, not manage infrastructure.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Auto-scan — wide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 rounded-2xl p-6 md:p-8 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Auto-scan your projects
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Point it at a folder. It finds every app automatically — no config needed.
              </p>
            </div>
            <div className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-black/[0.03] dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/5 md:w-72 shrink-0">
              <div className="text-gray-400 dark:text-gray-500 mb-2">~/projects</div>
              {[
                ['dashboard', 'VITE', 'text-emerald-500'],
                ['api-server', 'FASTAPI', 'text-blue-500'],
                ['analytics', 'STREAMLIT', 'text-purple-500'],
              ].map(([name, type, cls]) => (
                <div key={name} className="flex items-center gap-2 py-0.5">
                  <span className="text-gray-300 dark:text-gray-600">├─</span>
                  <span>{name}</span>
                  <span className={`text-[10px] font-bold ${cls}`}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Card 2: Multi-service */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
            Multi-app, one button
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Group related apps together. One click runs them all.
          </p>
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-3.5 text-xs font-mono mt-auto">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-semibold text-gray-800 dark:text-gray-200">My SaaS App</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">
                2 SERVICES
              </span>
            </div>
            {[
              ['Frontend', ':5173', 'bg-emerald-500'],
              ['Backend', ':8000', 'bg-blue-500'],
            ].map(([svc, port, dot]) => (
              <div key={svc} className="flex items-center gap-2 py-0.5 text-gray-500 dark:text-gray-400">
                <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                <span>{svc}</span>
                <span className="ml-auto text-gray-400">{port}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 3: Global shortcut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
            One keystroke away
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Summon Launchpad from anywhere — your browser, your editor, your Figma.
          </p>
          <div className="flex items-center gap-2.5 mt-auto">
            {keys.map((k) => (
              <div
                key={k}
                className="h-11 px-3.5 min-w-[44px] rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center text-base font-semibold text-gray-800 dark:text-gray-200"
              >
                {k}
              </div>
            ))}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">from anywhere</span>
          </div>
        </motion.div>

        {/* Card 4: Live logs — wide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="md:col-span-2 rounded-2xl p-6 md:p-8 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Live logs, no terminal needed
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                See what every app is doing in real time. Color-coded, per-app, always one click away.
              </p>
            </div>
            <div className="bg-gray-950 dark:bg-black/90 rounded-xl p-4 font-mono text-xs border border-white/10 space-y-1.5 md:w-80 shrink-0">
              <div className="text-green-400">✓ Ready on :8000</div>
              <div className="text-yellow-400">⚠ Reloading module...</div>
              <div className="text-blue-400">→ GET /api/users 200 12ms</div>
              <div className="text-gray-600">→ GET /api/health 200 1ms</div>
            </div>
          </div>
        </motion.div>

        {/* Card 5: Auto-start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
            Ready before you are
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Turn on auto-start and your apps boot the moment you log in.
          </p>
          <div className="flex items-center gap-3 mt-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">3 apps running</span>
            </div>
            <span className="text-xs text-gray-400">logged in 2s ago</span>
          </div>
        </motion.div>

        {/* Card 6: Smart setup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
            Zero configuration
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Detects your environment, finds a free port, identifies the framework. Just works.
          </p>
          <div className="space-y-2 font-mono text-xs text-gray-500 dark:text-gray-400 mt-auto">
            {[
              ['environment', 'detected'],
              ['port 8000', 'free'],
              ['framework', 'FastAPI'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span>{label}</span>
                <span className="text-gray-300 dark:text-gray-600">→</span>
                <span className="text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
