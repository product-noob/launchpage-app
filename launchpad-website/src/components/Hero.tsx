import { Terminal } from './Terminal';
import { motion } from 'motion/react';
import { Download, Github } from 'lucide-react';

const DOWNLOAD_MAC = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad-1.0.0-arm64.dmg';
const DOWNLOAD_WIN = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad.Setup.1.0.0.exe';
const GITHUB_URL = 'https://github.com/product-noob/launchpage-app';

function getOSInfo(): { label: string; url: string } {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return { label: 'Download for Windows', url: DOWNLOAD_WIN };
  return { label: 'Download for macOS', url: DOWNLOAD_MAC };
}

export function Hero() {
  const os = getOSInfo();

  return (
    <section className="pt-40 pb-20 px-6 w-full flex flex-col items-center relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/20 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-black to-black/60 dark:from-white dark:to-white/60 leading-[1.1]">
            Your local apps,<br className="hidden sm:block" /> always one click away.
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto font-medium tracking-tight"
        >
          A menu bar home for every dev server you build. Start, stop, and monitor without ever touching a terminal.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
        >
          <a
            href={os.url}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/25 w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            {os.label}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-900 dark:text-white font-semibold text-sm transition-colors w-full sm:w-auto justify-center backdrop-blur-md"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </motion.div>

        <Terminal />
      </div>
    </section>
  );
}
