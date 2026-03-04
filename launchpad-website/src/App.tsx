/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Showcase } from './components/Showcase';
import { PersonaSection } from './components/PersonaSection';
import { HowItWorks } from './components/HowItWorks';
import { BentoGrid } from './components/BentoGrid';
import { Marquee } from './components/Marquee';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-black text-gray-900 dark:text-white font-sans relative overflow-x-hidden">
        {/* Noise Overlay */}
        <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.04] dark:opacity-[0.06] mix-blend-overlay bg-noise" />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow flex flex-col items-center w-full">
            <Hero />
            <Showcase />
            <PersonaSection />
            <HowItWorks />
            <BentoGrid />
            <Marquee />
            <CTASection />
          </main>
          <Footer />
        </div>
      </div>
    </ThemeProvider>
  );
}
