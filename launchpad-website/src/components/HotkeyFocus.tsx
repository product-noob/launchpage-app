import { motion } from 'motion/react';

export function HotkeyFocus() {
  return (
    <section className="py-32 px-6 w-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="text-center relative z-10"
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-12 text-gray-900 dark:text-white">
          Global Hotkey. <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Feels like magic.</span>
        </h2>
        
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {['⌘', '⇧', 'L'].map((key, i) => (
            <motion.div
              key={key}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 + 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-3xl bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center text-4xl md:text-6xl font-medium text-gray-800 dark:text-gray-200 relative group"
            >
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
              <div className="absolute -inset-px rounded-2xl md:rounded-3xl bg-gradient-to-b from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              {key}
            </motion.div>
          ))}
        </div>
        
        <p className="mt-12 text-gray-600 dark:text-gray-400 font-medium">
          Hold <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono text-sm">Cmd</kbd> to peek. Release to hide.
        </p>
      </motion.div>
    </section>
  );
}
