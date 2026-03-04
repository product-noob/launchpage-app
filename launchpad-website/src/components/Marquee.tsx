const TECH_STACK = [
  'Vite', 'Streamlit', 'FastAPI', 'Astro', 'Node',
  'Django', 'Docker', 'Next.js', 'Go', 'Rust', 'Flask', 'Nuxt',
];

export function Marquee() {
  // Two identical copies -CSS animates the pair from 0 → -50%, then loops
  const items = [...TECH_STACK, ...TECH_STACK];

  return (
    <section className="py-16 border-y border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.01] overflow-hidden relative">
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8">
        Works with everything you build
      </h2>
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAFAFA] dark:from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FAFAFA] dark:from-black to-transparent z-10 pointer-events-none" />

      <div
        className="flex w-max"
        style={{ animation: 'launchpad-marquee 28s linear infinite' }}
      >
        {items.map((tech, i) => (
          <div
            key={i}
            className="px-10 text-2xl md:text-4xl font-bold text-gray-300 dark:text-gray-700 tracking-tight shrink-0"
          >
            {tech}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes launchpad-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
