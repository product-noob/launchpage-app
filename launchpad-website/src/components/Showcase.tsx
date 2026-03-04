import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Search, Play, Square, MoreVertical, Sun, Power, GripVertical, ChevronRight, Plus, ZoomIn, Maximize2 } from 'lucide-react';

interface AppItem {
  name: string;
  type: string;
  typeColor: string;
  running: boolean;
  port: string;
  hasChevron?: boolean;
}

const initialApps: AppItem[] = [
  { name: 'My Frontend', type: 'VITE', typeColor: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10', running: true, port: '5173' },
  { name: 'My API', type: 'FASTAPI', typeColor: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10', running: true, port: '8000' },
  { name: 'Fullstack App', type: '2 SERVICES', typeColor: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10', hasChevron: true, running: false, port: '3000' },
  { name: 'My Dashboard', type: 'STREAMLIT', typeColor: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10', running: false, port: '8501' },
];

// The automated demo sequence
const SEQUENCE_STEPS = [
  // Step 0: initial state (2 running, 2 stopped) - pause
  { action: 'pause', duration: 2000 },
  // Step 1: click play on "Fullstack App" (index 2)
  { action: 'click', appIndex: 2, duration: 600 },
  // Step 2: it goes to "starting" state
  { action: 'starting', appIndex: 2, duration: 1200 },
  // Step 3: it's now running
  { action: 'running', appIndex: 2, duration: 1500 },
  // Step 4: click play on "My Dashboard" (index 3)
  { action: 'click', appIndex: 3, duration: 600 },
  // Step 5: starting
  { action: 'starting', appIndex: 3, duration: 1200 },
  // Step 6: running - all 4 running now
  { action: 'running', appIndex: 3, duration: 2500 },
  // Step 7: stop "Fullstack App"
  { action: 'stop-click', appIndex: 2, duration: 600 },
  // Step 8: stopped
  { action: 'stopped', appIndex: 2, duration: 1000 },
  // Step 9: stop "My Dashboard"
  { action: 'stop-click', appIndex: 3, duration: 600 },
  // Step 10: stopped - back to initial
  { action: 'stopped', appIndex: 3, duration: 1500 },
] as const;

export function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [startingApp, setStartingApp] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Track visibility to only animate when in view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const runStep = useCallback(() => {
    const step = SEQUENCE_STEPS[stepIndex];

    if (step.action === 'pause') {
      // Just wait
    } else if (step.action === 'click') {
      // Highlight the play button
      setActiveButton(step.appIndex);
    } else if (step.action === 'starting') {
      setActiveButton(null);
      setStartingApp(step.appIndex);
    } else if (step.action === 'running') {
      setStartingApp(null);
      setApps(prev => prev.map((app, i) =>
        i === step.appIndex ? { ...app, running: true } : app
      ));
    } else if (step.action === 'stop-click') {
      setActiveButton(step.appIndex);
    } else if (step.action === 'stopped') {
      setActiveButton(null);
      setApps(prev => prev.map((app, i) =>
        i === step.appIndex ? { ...app, running: false } : app
      ));
    }
  }, [stepIndex]);

  // Run the animation loop
  useEffect(() => {
    if (!isVisible) return;

    runStep();
    const step = SEQUENCE_STEPS[stepIndex];
    const timer = setTimeout(() => {
      setStepIndex(prev => (prev + 1) % SEQUENCE_STEPS.length);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [stepIndex, isVisible, runStep]);

  // Reset when leaving viewport
  useEffect(() => {
    if (!isVisible) {
      setStepIndex(0);
      setApps(initialApps);
      setActiveButton(null);
      setStartingApp(null);
    }
  }, [isVisible]);

  const runningCount = apps.filter(a => a.running).length + (startingApp !== null ? 1 : 0);

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
          See it in action
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          All your apps, visible at a glance. Start, stop, and monitor -without opening a terminal.
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

        {/* Running counter */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between shrink-0 bg-[#FAFAFA] dark:bg-black/50">
          <AnimatePresence mode="wait">
            <motion.span
              key={runningCount}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {runningCount} of {apps.length} running
            </motion.span>
          </AnimatePresence>
        </div>

        {/* App List */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto bg-[#FAFAFA] dark:bg-black/50 flex flex-col gap-3">
          {apps.map((app, i) => {
            const isStarting = startingApp === i;
            const isActive = activeButton === i;
            const isRunning = app.running || isStarting;

            return (
              <motion.div
                key={app.name}
                layout
                className="flex items-center gap-3 group"
              >
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-700 cursor-grab shrink-0" />
                <motion.div
                  animate={isActive ? {
                    borderColor: app.running
                      ? 'rgba(239,68,68,0.4)'
                      : 'rgba(16,185,129,0.4)',
                    scale: 1.01,
                  } : {
                    borderColor: undefined,
                    scale: 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-3 flex items-center justify-between shadow-sm transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Status dot */}
                    <motion.div
                      animate={isStarting ? {
                        backgroundColor: ['#f59e0b', '#fbbf24', '#f59e0b'],
                        boxShadow: [
                          '0 0 8px rgba(245,158,11,0.6)',
                          '0 0 12px rgba(245,158,11,0.8)',
                          '0 0 8px rgba(245,158,11,0.6)',
                        ],
                      } : {}}
                      transition={isStarting ? { duration: 0.8, repeat: Infinity } : {}}
                      className={`w-2.5 h-2.5 rounded-full ${
                        isStarting
                          ? 'bg-amber-500'
                          : app.running
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                            : 'bg-gray-400 dark:bg-gray-600'
                      }`}
                    />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{app.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${app.typeColor}`}>
                      {app.type}
                    </span>
                    {app.hasChevron && (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Port - show when running or starting */}
                    <AnimatePresence>
                      {(app.running || isStarting) && app.port && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs text-gray-400 font-mono overflow-hidden"
                        >
                          :{app.port}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Play/Stop button */}
                    {isRunning ? (
                      <motion.button
                        animate={isActive ? { scale: [1, 0.9, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isStarting
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                        }`}
                      >
                        {isStarting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full"
                          />
                        ) : (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        )}
                      </motion.button>
                    ) : (
                      <motion.button
                        animate={isActive ? { scale: [1, 0.85, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </motion.button>
                    )}
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
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
