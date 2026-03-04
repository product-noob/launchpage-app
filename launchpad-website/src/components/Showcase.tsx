import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Search, Play, Square, MoreVertical, Sun, Power, GripVertical, ChevronRight, Plus, ZoomIn, Maximize2 } from 'lucide-react';

export function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const apps = [
    { name: 'My Frontend', type: 'VITE', typeColor: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10', running: true, port: '5173' },
    { name: 'My API', type: 'FASTAPI', typeColor: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10', running: true, port: '8000' },
    { name: 'Fullstack App', type: '2 SERVICES', typeColor: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10', hasChevron: true, running: false },
    { name: 'My Dashboard', type: 'STREAMLIT', typeColor: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10', running: false },
  ];

  return (
    <section ref={ref} className="py-20 px-6 w-full [perspective:2000px] flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="text-center mb-12 max-w-2xl"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
          Your entire dev stack, one click away
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          All your servers, visible at a glance.
        </p>
      </motion.div>

      <motion.div
        style={{ rotateX, scale, opacity, transformStyle: "preserve-3d" }}
        className="w-full max-w-[480px] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.6)] bg-white dark:bg-[#0A0A0A] flex flex-col h-[720px] relative z-20"
      >
        {/* macOS traffic lights */}
        <div className="h-9 flex items-center px-4 gap-2 bg-white dark:bg-[#0A0A0A] border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        {/* Header */}
        <div className="h-14 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-[#0A0A0A]">
          <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-sm font-medium">
            <Power className="w-4 h-4" /> Quit
          </button>
          <div className="font-bold tracking-widest text-sm text-gray-700 dark:text-gray-300">
            LAUNCHPAD
          </div>
          <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <Sun className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-3 shrink-0 bg-white dark:bg-[#0A0A0A]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter apps... ⌘K"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-sm focus:outline-none dark:text-white placeholder:text-gray-400"
              disabled
            />
          </div>
          <button className="px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
            Start All
          </button>
        </div>

        {/* App List */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#FAFAFA] dark:bg-black/50 flex flex-col gap-3">
          {apps.map((app, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-700 cursor-grab shrink-0" />
              <div className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-3 flex items-center justify-between shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${app.running ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-400 dark:bg-gray-600'}`} />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{app.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${app.typeColor}`}>
                    {app.type}
                  </span>
                  {app.hasChevron && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {app.running && app.port && (
                    <span className="text-xs text-gray-400 font-mono">:{app.port}</span>
                  )}
                  {app.running ? (
                    <button className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  )}
                  <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3 shrink-0 bg-white dark:bg-[#0A0A0A]">
          <button className="flex-1 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add App
          </button>
          <button className="w-10 h-10 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
