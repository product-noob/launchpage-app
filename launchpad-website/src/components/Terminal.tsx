import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Terminal() {
  const [os, setOs] = useState<'macOS' | 'Windows'>('macOS');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (navigator.userAgent.indexOf('Win') !== -1) {
      setOs('Windows');
    } else {
      setOs('macOS');
    }
  }, []);

  const command = os === 'macOS' 
    ? 'brew install --cask princejain/tap/launchpad'
    : 'winget install launchpad';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-16 relative z-20">
      <div className="flex justify-center mb-6">
        <div className="flex p-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
          <button
            onClick={() => setOs('macOS')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              os === 'macOS' 
                ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            macOS
          </button>
          <button
            onClick={() => setOs('Windows')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              os === 'Windows' 
                ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Windows
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={`relative rounded-xl overflow-hidden border transition-colors duration-300 bg-white/50 dark:bg-[#0A0A0A]/80 backdrop-blur-2xl shadow-2xl ${
          copied ? 'border-green-500/50 dark:border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'border-black/10 dark:border-white/10'
        }`}
      >
        <div className="h-10 px-4 flex items-center border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-black/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-black/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-black/10" />
          </div>
        </div>
        <div className="p-6 flex items-center justify-between group relative">
          <div className="font-mono text-sm text-gray-800 dark:text-gray-300 overflow-x-auto whitespace-nowrap flex items-center h-6 min-w-0">
            <span className="text-indigo-500 dark:text-indigo-400 mr-3">~</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={os}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {command}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="relative flex items-center">
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: -30, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-0 top-0 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded shadow-lg pointer-events-none"
                >
                  Copied
                  <div className="absolute -bottom-1 right-3 w-2 h-2 bg-green-500 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              onClick={handleCopy}
              className="ml-4 p-1.5 rounded-md text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Copy to clipboard"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
