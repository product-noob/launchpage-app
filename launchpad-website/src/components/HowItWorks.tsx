import { motion } from 'motion/react';
import { Command, MousePointerClick, Zap } from 'lucide-react';

const steps = [
  {
    icon: Command,
    title: "Open Launchpad",
    description: "One keyboard shortcut from anywhere. Always a click away in your menu bar."
  },
  {
    icon: MousePointerClick,
    title: "Pick your app",
    description: "Search or scroll to find what you need. Launchpad remembers every project."
  },
  {
    icon: Zap,
    title: "It's running",
    description: "Ports, environments, and logs are handled automatically. Just build."
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6 w-full max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
          Up and running in seconds.
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Three steps. Zero terminal commands.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Connecting line for desktop */}
        <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
        
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="relative flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/10 shadow-xl flex items-center justify-center mb-6 relative z-10 group hover:border-indigo-500/50 transition-colors">
              <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <step.icon className="w-8 h-8 text-gray-800 dark:text-gray-200 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
