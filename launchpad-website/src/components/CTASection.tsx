import { motion } from 'motion/react';
import { Download, Star } from 'lucide-react';
import { GITHUB_URL, getOSInfo } from '../constants';

export function CTASection() {
  const dl = getOSInfo();
  return (
    <section id="install" className="w-full py-32 px-6 relative overflow-hidden bg-gray-950 dark:bg-black scroll-mt-20">
      {/* Indigo glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-violet-600/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-[1.05] mb-6"
        >
          Your apps are waiting.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          Launchpad keeps every project ready to launch -summon them all in one click.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href={dl.url}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors shadow-lg shadow-indigo-500/30 w-full sm:w-auto justify-center"
          >
            <Download className="w-5 h-5" />
            {dl.label}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-colors w-full sm:w-auto justify-center"
          >
            <Star className="w-5 h-5" />
            Star on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
