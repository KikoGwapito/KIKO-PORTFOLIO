import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue, useMotionValue, useSpring, useMotionTemplate } from 'motion/react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { formatTextWithAccent } from '../utils/formatText';

gsap.registerPlugin(ScrollTrigger);

function interpolateRaw(val: number, stops: number[], values: number[]): number {
  if (val <= stops[0]) return values[0];
  if (val >= stops[stops.length - 1]) return values[values.length - 1];
  for (let k = 0; k < stops.length - 1; k++) {
    if (val >= stops[k] && val <= stops[k+1]) {
      const t = (val - stops[k]) / (stops[k+1] - stops[k]);
      return values[k] + t * (values[k+1] - values[k]);
    }
  }
  return 0;
}

interface ProcessStep {
  title: string;
  description: string;
  media?: any;
}

interface ProcessParallaxProps {
  steps: ProcessStep[];
  primaryColor: string;
  title: string;
  subtitle: string;
  label: string;
}

export const ProcessParallax: React.FC<ProcessParallaxProps> = ({ steps, primaryColor, title, subtitle, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const allCards = [
    { type: 'title', title, subtitle, label },
    ...steps.map((s, i) => ({ type: 'step', stepNum: i + 1, ...s }))
  ];
  
  const totalCards = allCards.length;
  const numPhases = totalCards;

  useGSAP(() => {
    if (!containerRef.current || totalCards <= 1) return;

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      snap: {
        snapTo: 1 / (numPhases + 1), // Using numPhases + 1 intervals for the extended intro sequence
        duration: { min: 0.2, max: 0.6 },
        delay: 0.05,
        ease: "power1.inOut",
        directional: true
      }
    });

    return () => st.kill();
  }, { scope: containerRef, dependencies: [numPhases] });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map progress to include an intro sequence (-2 to 0) and the normal sequence (0 to numPhases - 1)
  const rawPhase = useTransform(scrollYProgress, [0, 1], [-2, numPhases - 1]);
  
  const phase = useTransform(rawPhase, (p: number) => {
    if (p < 0) {
      // Intro easing: smooth fast-to-slow speed ramp from left (-2 to 0)
      if (p < -1) {
        const t = p + 2; 
        const easedT = 1 - Math.pow(1 - t, 3);
        return -2 + easedT;
      } else {
        const t = p + 1;
        const easedT = 1 - Math.pow(1 - t, 3);
        return -1 + easedT;
      }
    }
    if (p >= numPhases - 1) return numPhases - 1;
    
    // Regular scrolling easing
    const base = Math.floor(p);
    const fraction = p - base;
    const flatThreshold = 0.4; 
    
    if (fraction <= flatThreshold) {
      return base;
    } else {
      const t = (fraction - flatThreshold) / (1 - flatThreshold);
      const easedT = t * t * (3 - 2 * t);
      return base + easedT;
    }
  });

  const scrollToPhase = (phaseTarget: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    
    // progress adjusted for the -2 to (numPhases-1) mapping
    const progress = (phaseTarget + 2) / (numPhases + 1);
    const totalScroll = window.innerHeight * ((numPhases + 2) * 1.5 - 1);
    const targetY = absoluteTop + Math.max(0, progress * totalScroll);
    
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return (
    <section 
      ref={containerRef} 
      className="w-full relative z-20 border-t border-zinc-800/30 bg-transparent"
      style={{ height: `${(numPhases + 2) * 150}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center" style={{ perspective: "1500px" }}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px]" 
               style={{ backgroundColor: `${primaryColor}20` }} />
        </div>

        <div className="relative w-full max-w-7xl h-full flex items-center justify-center pointer-events-none">
          {allCards.map((card, i) => (
             <CarouselCard 
               key={i} 
               card={card} 
               index={i} 
               phase={phase} 
               primaryColor={primaryColor} 
               onClick={() => scrollToPhase(i)}
             />
          ))}
        </div>
      </div>
    </section>
  );
};

function CarouselCard({ 
  card, 
  index, 
  phase, 
  primaryColor,
  onClick
}: { 
  card: any;
  index: number;
  phase: MotionValue<number>;
  primaryColor: string;
  onClick: () => void;
  key?: React.Key;
}) {
  const isTitle = card.type === 'title';

  const x = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return `${interpolateRaw(p, [-2, -1, 0], [-200, 0, 0])}%`;
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [280, 210, 140, 70, 0, -70, -140, -210, -280]);
      return `${interpolateRaw(p, [-2, -1, 0], [0, 0, target])}%`;
    }
    const diff = p - index;
    return `${interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [280, 210, 140, 70, 0, -70, -140, -210, -280])}%`;
  });

  const y = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return `${interpolateRaw(p, [-2, -1, 0], [0, 0, 0])}%`;
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [180, 135, 90, 45, 0, -45, -90, -135, -180]);
      return `${interpolateRaw(p, [-2, -1, 0], [0, 0, target])}%`;
    }
    const diff = p - index;
    return `${interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [180, 135, 90, 45, 0, -45, -90, -135, -180])}%`;
  });

  const z = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return interpolateRaw(p, [-2, -1, 0], [-200, 0, 0]);
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [-600, -450, -300, -150, 0, -150, -300, -450, -600]);
      return interpolateRaw(p, [-2, -1, 0], [-100, -100, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [-600, -450, -300, -150, 0, -150, -300, -450, -600]);
  });
  
  const baseRotateX = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return 0;
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [-12, -9, -6, -3, 0, 3, 6, 9, 12]);
      return interpolateRaw(p, [-2, -1, 0], [0, 0, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [-12, -9, -6, -3, 0, 3, 6, 9, 12]);
  });

  // Fanning twist inverted -> rotates from +16 to -16 so trailing cards twist to the left
  const baseRotateZ = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return interpolateRaw(p, [-2, -1, 0], [10, 0, 0]);
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [16, 12, 8, 4, 0, -4, -8, -12, -16]);
      return interpolateRaw(p, [-2, -1, 0], [0, 0, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [16, 12, 8, 4, 0, -4, -8, -12, -16]);
  });

  const baseRotateY = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return interpolateRaw(p, [-2, -1, 0], [-60, 0, 0]);
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [20, 15, 10, 5, 0, -5, -10, -15, -20]);
      return interpolateRaw(p, [-2, -1, 0], [0, 0, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [20, 15, 10, 5, 0, -5, -10, -15, -20]);
  });

  const opacity = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return interpolateRaw(p, [-2, -1, 0], [0, 1, 1]);
      const target = interpolateRaw(0 - index, [-4,-3,-2,-1,0,1,2,3,4], [0, 0.3, 0.6, 0.85, 1, 0.85, 0.6, 0.3, 0]);
      return interpolateRaw(p, [-2, -1, 0], [0, 0, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-4,-3,-2,-1,0,1,2,3,4], [0, 0.3, 0.6, 0.85, 1, 0.85, 0.6, 0.3, 0]);
  });

  const scale = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return 1;
      const target = interpolateRaw(0 - index, [-3,-2,-1,0,1,2,3], [0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.7]);
      return interpolateRaw(p, [-2, -1, 0], [0.8, 0.8, target]);
    }
    const diff = p - index;
    return interpolateRaw(diff, [-3,-2,-1,0,1,2,3], [0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.7]);
  });

  const zIndex = useTransform(phase, (p: number) => {
    const diff = Math.abs(p - index);
    return Math.round(100 - diff * 10);
  });

  const filter = useTransform(phase, (p: number) => {
    if (p < 0) {
      if (index === 0) return `brightness(100%) grayscale(0%)`;
      const target = interpolateRaw(Math.abs(0 - index), [0, 1, 2], [100, 70, 50]);
      return `brightness(${interpolateRaw(p, [-2, -1, 0], [30, 30, target])}%) grayscale(0%)`;
    }
    const diff = p - index;
    const b = interpolateRaw(Math.abs(diff), [0, 1, 2], [100, 70, 50]);
    return `brightness(${b}%) grayscale(${100 - b}%)`;
  });

  const pointerEvents = "auto";

  // Local interaction state
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const isHovered = useMotionValue(0);

  const hoverRotateXBase = useTransform(mouseY, [0, 1], ["8deg", "-8deg"]);
  const hoverRotateYBase = useTransform(mouseX, [0, 1], ["-8deg", "8deg"]);
  
  // Lower damping to cause a wiggle/bounce when the mouse is released (or enters)
  const hoverRotateX = useSpring(hoverRotateXBase, { stiffness: 300, damping: 10 });
  const hoverRotateY = useSpring(hoverRotateYBase, { stiffness: 300, damping: 10 });
  
  const glareX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const glareOpacity = useSpring(isHovered, { stiffness: 300, damping: 20 });
  
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = phase.get();
    const diff = Math.abs(p - index);
    // Expand interactive radius a little bit so user can play with nearby stacked cards
    if (diff > 1.5) return; 
    
    isHovered.set(1);
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;

    mouseX.set(mouseXPos / width);
    mouseY.set(mouseYPos / height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    isHovered.set(0);
  };

  const imageIndex = isTitle ? 'abstract-dark' : `process-step-${index}`;

  return (
    <motion.div
      onClick={onClick}
      style={{
        x,
        y,
        z,
        scale,
        opacity,
        zIndex,
        pointerEvents,
        rotateZ: baseRotateZ,
        transformStyle: "preserve-3d",
      }}
      className="absolute shrink-0 w-[300px] h-[400px] md:w-[340px] md:h-[480px] lg:w-[380px] lg:h-[540px] cursor-pointer group"
    >
      <div style={{ perspective: "1500px" }} className="w-full h-full">
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX: baseRotateX,
            rotateY: baseRotateY,
            transformStyle: "preserve-3d"
          }}
          className="w-full h-full relative"
        >
          <motion.div
            style={{
              rotateX: hoverRotateX,
              rotateY: hoverRotateY,
              filter,
              transformStyle: "preserve-3d"
            }}
            className="w-full h-full relative"
          >
            {isTitle ? (
              <TitleCard card={card} primaryColor={primaryColor} imageIndex={imageIndex} />
            ) : (
              <StepCard3D card={card} index={index} primaryColor={primaryColor} imageIndex={imageIndex} />
            )}
            
            {/* Interactive Shiny Glare Overlay */}
            <motion.div 
               className="absolute inset-0 pointer-events-none rounded-[2rem] z-50 mix-blend-overlay"
               style={{
                 opacity: glareOpacity,
                 background: glareBackground
               }}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TitleCard({ card, primaryColor, imageIndex }: { card: any, primaryColor: string, imageIndex: string }) {
  return (
    <div 
        className="group w-full h-full relative rounded-[2rem] bg-zinc-900 border border-zinc-800/50 flex flex-col justify-end p-6 md:p-8 shadow-2xl overflow-hidden transition-colors glow-top-edge-hover"
        style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={`https://picsum.photos/seed/${imageIndex}/800/1200`} 
          alt="Process Title"
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-zinc-950/20" />
      </div>

      <div className="relative z-10 w-full" style={{ transform: "translateZ(40px)" }}>
        <div className="flex flex-col justify-end h-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-[1px]" style={{ backgroundColor: primaryColor }}></span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">
                {card.label || 'Process'}
              </span>
            </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tighter text-white drop-shadow-lg break-words">
            {formatTextWithAccent(card.title, primaryColor)}
          </h2>
          
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base mb-6 drop-shadow-md break-words whitespace-normal max-w-sm">
            {card.subtitle}
          </p>
          
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 mt-auto group-hover:text-white transition-colors duration-300">
            <div 
              className="w-8 h-8 rounded-full border flex items-center justify-center animate-bounce shadow-lg"
              style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              →
            </div>
            <span className="ml-2">Scroll or Click</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard3D({ card, index, primaryColor, imageIndex }: { card: any, index: number, primaryColor: string, imageIndex: string }) {
  return (
    <div 
        className="group w-full h-full relative rounded-[2rem] bg-zinc-900 border border-zinc-800/50 flex flex-col justify-end p-6 md:p-8 shadow-2xl overflow-hidden transition-colors glow-top-edge-hover"
        style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        {card.media?.url ? (
           card.media.type === 'video' ? (
             <video 
               src={card.media.url}
               autoPlay
               loop
               muted
               playsInline
               className="w-full h-full object-cover opacity-60 pointer-events-none"
             />
           ) : (
             <img 
               src={card.media.url}
               alt={card.title || "Process Step"}
               className="w-full h-full object-cover opacity-60"
               referrerPolicy="no-referrer"
             />
           )
        ) : (
          <img 
            src={`https://picsum.photos/seed/${imageIndex}/800/1200`} 
            alt={card.title || "Process Step"}
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-zinc-950/20" />
      </div>

      <div className="relative z-10 w-full" style={{ transform: "translateZ(40px)" }}>
        <div className="flex flex-col justify-end h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="text-5xl md:text-7xl font-black text-white/10 select-none leading-none">
              {(card.stepNum || index).toString().padStart(2, '0')}
            </div>
            
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-md border border-white/10"
              style={{ backgroundColor: `${primaryColor}40` }}
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
          </div>
          
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 tracking-tighter text-white drop-shadow-lg break-words">
            {formatTextWithAccent(card.title, primaryColor)}
          </h3>
          
          <div className="overflow-y-auto max-h-[140px] md:max-h-[160px] pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
            <p className="text-zinc-300 leading-relaxed text-sm drop-shadow-md group-hover:text-white transition-colors duration-300 whitespace-normal break-words">
              {card.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
