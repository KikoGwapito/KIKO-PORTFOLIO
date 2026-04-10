import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { Magnetic } from '../components/Magnetic';

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

function ProcessStep({ step, index, themeColor }: { step: any, index: number, themeColor: string, key?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2 / speed, delay: (index * 0.1) / speed, ease: [0.22, 1, 0.36, 1] }}
      className={`p-10 rounded-[2.5rem] border transition-all duration-700 cursor-pointer group relative overflow-hidden ${isOpen ? 'glass border-zinc-700/50 shadow-2xl' : 'bg-transparent border-zinc-800/20 hover:border-zinc-700/50 hover:bg-zinc-900/10'}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-500"
            style={{ 
              backgroundColor: isOpen ? themeColor : 'rgba(39, 39, 42, 0.5)',
              color: isOpen ? '#09090b' : '#71717a',
              boxShadow: isOpen ? `0 0 30px ${themeColor}40` : 'none'
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
          <h3 
            className="text-2xl md:text-4xl font-bold tracking-tight transition-colors duration-300"
            style={{ color: isOpen ? '#fff' : '#a1a1aa' }}
          >
            {step.title}
          </h3>
        </div>
        
        <motion.div 
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-100 transition-colors"
        >
          <motion.div 
            animate={{ y: isOpen ? 0 : [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            ▼
          </motion.div>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-8 mt-8 border-t border-zinc-800/50">
              <div className="text-zinc-400 leading-relaxed max-w-3xl text-xl font-light">
                <TypewriterText text={step.description} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Process() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  
  return (
    <div className="pt-40 pb-32 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-screen relative">
      {/* Background Accents */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-[var(--color-primary)] opacity-[0.03] blur-[120px] pointer-events-none" style={{ '--color-primary': data.theme.primaryColor } as any} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
        className="mb-24 relative z-10"
      >
        <div className="inline-block px-3 py-1 rounded-full border border-zinc-800 text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 bg-zinc-900/50">
          Workflow
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-8">
          {formatTextWithAccent(data.process.title, data.theme.primaryColor)}
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl font-light leading-relaxed">
          {formatTextWithAccent(data.process.subtitle, data.theme.primaryColor)}
        </p>
      </motion.div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(data.process.steps.length, 3)} gap-8 relative z-10`}>
        {[...data.process.steps].reverse().map((step, index) => (
          <ProcessStep 
            key={index} 
            step={step} 
            index={index} 
            themeColor={data.theme.primaryColor}
          />
        ))}
      </div>

      {data.process.media && data.process.media.length > 0 && (
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          {data.process.media.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, delay: i * 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl overflow-hidden bg-zinc-900/50 border border-zinc-800/50 relative group aspect-video"
            >
              {m.type === 'video' ? (
                <video 
                  src={m.url || undefined} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" 
                />
              ) : (
                <img 
                  src={m.url || undefined} 
                  alt={`Process media ${i + 1}`} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700 select-none pointer-events-none" 
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
