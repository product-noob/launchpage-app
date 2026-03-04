import { motion } from 'motion/react';
import { Sparkles, MousePointerClick, Brain } from 'lucide-react';

const personas = [
  {
    icon: Sparkles,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    heading: '"I just built another app"',
    description:
      'Launchpad auto-discovers your projects and remembers every start command \u2014 so you don\u2019t have to.',
  },
  {
    icon: MousePointerClick,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    heading: '"I\'m a PM who prototypes"',
    description:
      'No terminal knowledge needed. See all your apps, click to start, click to stop. That\u2019s it.',
  },
  {
    icon: Brain,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    heading: '"I built it but forgot how to run it"',
    description:
      'Launchpad auto-detects your framework, finds your virtualenv, and picks a free port. Just click play.',
  },
];

export function PersonaSection() {
  return (
    <section className="py-24 px-6 max-w-5xl mx-auto w-full">
      <div className="mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          Built for vibe coders & PMs who prototype.
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((p, i) => (
          <motion.div
            key={p.heading}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/[0.04] transition-colors flex flex-col items-center text-center"
          >
            <div
              className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mb-5 shrink-0`}
            >
              <p.icon className={`w-6 h-6 ${p.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {p.heading}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {p.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
