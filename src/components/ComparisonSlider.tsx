import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Maximize, Minimize } from 'lucide-react';

interface ComparisonSliderProps {
  beforeUrl: string;
  afterUrl: string;
  className?: string;
}

export default function ComparisonSlider({ beforeUrl, afterUrl, className = "" }: ComparisonSliderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderPos = useMotionValue(50); // percentage
  const clipPath = useTransform(sliderPos, (pos) => `inset(0 ${100 - pos}% 0 0)`);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    sliderPos.set(percent);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isResizing) handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isResizing) handleMove(e.touches[0].clientX);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  return (
    <motion.div 
      ref={containerRef}
      className={`relative overflow-hidden select-none cursor-ew-resize rounded-xl group ${className} ${isFullscreen ? 'bg-black flex items-center justify-center' : ''}`}
      onMouseDown={() => setIsResizing(true)}
      onTouchStart={() => setIsResizing(true)}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      {/* After Image (Background) */}
      <img 
        src={afterUrl} 
        alt="After" 
        className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} pointer-events-none`}
        referrerPolicy="no-referrer"
      />

      {/* Before Image (Foreground with Clip) */}
      <motion.div 
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{ clipPath }}
      >
        <img 
          src={beforeUrl} 
          alt="Before" 
          className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} pointer-events-none`}
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Slider Handle */}
      <motion.div 
        className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center"
        style={{ left: useTransform(sliderPos, (pos) => `${pos}%`) }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center -translate-x-1/2">
          <div className="flex gap-1">
            <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
            <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Labels */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.div 
              initial={{ opacity: 0, filter: "blur(10px)", y: -10 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-wider text-white pointer-events-none"
            >
              Before
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, filter: "blur(10px)", y: -10 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-wider text-white pointer-events-none"
            >
              After
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Button */}
      <div className="absolute bottom-4 right-4 z-20">
        <button 
          onClick={toggleFullscreen}
          className="p-2 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}
