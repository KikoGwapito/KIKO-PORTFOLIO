import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppData } from '../context/AppDataContext';
import { ProcessParallax } from '../components/ProcessParallax';

export default function Process() {
  const { data } = useAppData();
  
  return (
    <div className="w-full relative pb-32">
      {/* Background Accents */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] blur-[120px] pointer-events-none" style={{ '--color-primary': data.theme.primaryColor } as any} />
      
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
