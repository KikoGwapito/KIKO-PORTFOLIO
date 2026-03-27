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

function ProcessStep({ step, index, themeColor, isLast }: { step: any, index: number, themeColor: string, isLast: boolean, key?: React.Key }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;

  return (
    <div className="relative">
      {!isLast && (
        <div 
          className="absolute left-[1.15rem] top-10 bottom-0 w-[1px] bg-zinc-800 hidden md:block"
          style={{ background: isOpen ? `linear-gradient(to bottom, ${themeColor}, transparent)` : undefined }}
        />
      )}
      
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 / speed, delay: (index * 0.1) / speed, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex gap-8 items-start group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Magnetic strength={0.2} className="flex-shrink-0 z-10">
          <div 
            className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center font-mono text-sm transition-all duration-500 bg-zinc-950"
            style={{ 
              borderColor: isOpen ? themeColor : undefined,
              color: isOpen ? themeColor : undefined,
              boxShadow: isOpen ? `0 0 20px ${themeColor}40` : undefined
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
        </Magnetic>

        <div className="flex-grow pt-1 pb-12">
          <h3 
            className="text-2xl md:text-3xl font-bold mb-4 transition-colors duration-300 flex items-center gap-4"
            style={{ color: isOpen ? themeColor : undefined }}
          >
            {step.title}
            <motion.div 
              animate={{ rotate: isOpen ? 180 : 0 }}
              className="text-xs opacity-30"
            >
              ▼
            </motion.div>
          </h3>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="text-zinc-400 leading-relaxed max-w-2xl text-lg glass p-6 rounded-2xl border-zinc-800/50">
                  <TypewriterText text={step.description} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!isOpen && (
            <p className="text-zinc-500 line-clamp-1 max-w-md opacity-50 group-hover:opacity-100 transition-opacity">
              {step.description}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Process() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  
  return (
    <div className="pt-40 pb-32 px-6 max-w-7xl mx-auto min-h-screen relative">
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

      <div className="max-w-4xl relative z-10">
        {data.process.steps.map((step, index) => (
          <ProcessStep 
            key={index} 
            step={step} 
            index={index} 
            themeColor={data.theme.primaryColor}
            isLast={index === data.process.steps.length - 1}
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
