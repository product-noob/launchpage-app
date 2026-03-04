import { Moon, Sun, Github, Rocket, Download } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion } from 'motion/react';

const DOWNLOAD_MAC = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad-1.0.0-arm64.dmg';
const DOWNLOAD_WIN = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad.Setup.1.0.0.exe';
const GITHUB_URL = 'https://github.com/product-noob/launchpage-app';

function getDownloadUrl() {
  return navigator.userAgent.includes('Win') ? DOWNLOAD_WIN : DOWNLOAD_MAC;
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const downloadUrl = getDownloadUrl();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 w-full z-50 border-b border-black/5 dark:border-white/[0.08] bg-white/60 dark:bg-black/40 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <Rocket className="w-5 h-5 text-indigo-500" />
          <span>Launchpad</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">GitHub</span>
          </a>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
          <a
            href={downloadUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
