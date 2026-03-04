import { Rocket, Github, Twitter } from 'lucide-react';
import { GITHUB_URL } from '../constants';

export function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/5 py-8 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: app name */}
        <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
          <Rocket className="w-4 h-4 text-indigo-500" />
          <span>Launchpad</span>
        </div>

        {/* Right: links */}
        <div className="flex items-center gap-5 text-gray-500 dark:text-gray-400">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-black dark:hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://x.com/Prince_Jain17"
            target="_blank"
            rel="noreferrer"
            className="hover:text-black dark:hover:text-white transition-colors"
            aria-label="Twitter / X"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://princejain.me"
            target="_blank"
            rel="noreferrer"
            className="hover:text-black dark:hover:text-white transition-colors text-sm font-medium"
          >
            princejain.me
          </a>
        </div>
      </div>
    </footer>
  );
}
