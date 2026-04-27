import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppData } from '../context/AppDataContext';
import { ProcessParallax } from '../components/ProcessParallax';
import { Mouse } from 'lucide-react';

export default function Process() {
  const { data } = useAppData();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="w-full relative pb-32">
      {/* Background Accents */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] blur-[120px] pointer-events-none" style={{ '--color-primary': data.theme.primaryColor } as any} />
      
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
        <motion.div 
          className="glass px-6 py-3 rounded-full flex gap-3 items-center"
          animate={{ 
            opacity: hasScrolled ? 0 : 1, 
            y: hasScrolled ? 20 : [0, 10, 0],
            scale: hasScrolled ? 0.9 : 1
          }}
          transition={{ 
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
            y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Mouse className="w-5 h-5 text-zinc-400" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">Scroll to view</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, filter: "blur(15px)" }}
        animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none"} }}
        transition={{ duration: 1.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="pt-20"
      >
        <ProcessParallax 
          steps={data.process.steps} 
          primaryColor={data.theme.primaryColor}
          title={data.process.title}
          subtitle={data.process.subtitle}
          label={data.process.label || 'How I Work'}
        />
      </motion.div>
    </div>
  );
}
