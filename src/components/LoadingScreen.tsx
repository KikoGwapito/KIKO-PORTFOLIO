import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppData } from '../context/AppDataContext';

interface LoadingScreenProps {
  onComplete: () => void;
  onGreetingShow?: () => void;
}

export function LoadingScreen({ onComplete, onGreetingShow }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const { data } = useAppData();
  const primaryColor = data.theme.primaryColor || '#10b981';

  useEffect(() => {
    let startTime = performance.now();
    const duration = 2500; // 2.5 seconds loading

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let p = (elapsed / duration) * 100;
      
      if (p >= 100) {
        setProgress(100);
        setTimeout(() => {
          setShowGreeting(true);
          if (onGreetingShow) onGreetingShow();
          setTimeout(() => {
            onComplete();
          }, 3000); // Hold for 3 seconds to show greeting
        }, 1000); // Hold at 100% for 1 second before showing greeting
      } else {
        // Easing function for smoother graph effect
        const easeOutExpo = p === 100 ? 1 : 1 - Math.pow(2, -10 * p / 100);
        setProgress(easeOutExpo * 100);
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [onComplete]);

  // Generate some fake graph points that animate over time relative to progress
  const numPoints = 20;
  const graphPoints = Array.from({ length: numPoints }).map((_, i) => {
    const x = (i / (numPoints - 1)) * 100;
    // Base sine wave
    const baseHeight = Math.sin((x / 100) * Math.PI * 3 + (progress / 100) * Math.PI * 10) * 20 + 30;
    // Add some random "loading" spikes
    const spike = (Math.random() * 20) * (progress < 90 ? 1 : 0); 
    // Smooth out towards 100%
    const smoothFactor = 1 - (progress / 100);
    const y = baseHeight + (spike * smoothFactor);
    return `${x}%, ${100 - Math.min(100, Math.max(0, y))}%`;
  });

  const polygonPoints = `0%, 100% ${graphPoints.join(' ')} 100%, 100%`;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-transparent pointer-events-none"
    >
      <AnimatePresence mode="wait">
        {!showGreeting ? (
          <motion.div
            key="loading-ui"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center relative w-full max-w-sm px-8"
          >
            {/* Loading Graph Visual */}
            <div className="w-full h-32 relative mb-8 overflow-hidden rounded-lg">
              <motion.div 
                className="absolute inset-0 opacity-30"
                style={{ 
                  background: `linear-gradient(to top, ${primaryColor}40, transparent)`,
                  clipPath: `polygon(${polygonPoints})`
                }}
              />
              {/* Scanning line indicator */}
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-white mix-blend-color-dodge transition-all duration-75"
                style={{ 
                  left: `${progress}%`,
                  boxShadow: `0 0 10px ${primaryColor}, 0 0 20px ${primaryColor}` 
                }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/80" />
            </div>

            {/* Counter */}
            <div className="flex flex-col items-center">
              <div className="text-6xl md:text-8xl font-bold font-mono tracking-tighter" style={{ color: primaryColor }}>
                {Math.floor(progress)}<span className="text-3xl md:text-4xl text-zinc-600">%</span>
              </div>
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: progress >= 100 ? 0 : 1 }}
                className="text-xs uppercase tracking-[0.3em] text-zinc-500 mt-4 font-semibold"
              >
                Initializing System
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="greeting-ui"
            initial={{ opacity: 0, scale: 0.9, filter: 'drop-shadow(0 0 0px transparent)' }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0.9, 1, 1.05, 1.1],
              filter: [
                'drop-shadow(0 0 0px transparent)',
                `drop-shadow(0 0 30px ${primaryColor}60)`,
                `drop-shadow(0 0 120px ${primaryColor})`,
                'drop-shadow(0 0 0px transparent)'
              ]
            }}
            transition={{ duration: 2.8, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
            className="flex flex-col items-center justify-center w-full px-8"
          >
            <h1 
              className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text text-center uppercase" 
              style={{ 
                backgroundImage: `linear-gradient(135deg, #fff 0%, ${primaryColor} 100%)`
              }}
            >
              {data.theme.loadingText || 'ENJOY!'}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
