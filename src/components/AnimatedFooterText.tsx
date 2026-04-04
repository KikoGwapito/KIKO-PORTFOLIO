import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedFooterTextProps {
  primaryColor: string;
}

export const AnimatedFooterText: React.FC<AnimatedFooterTextProps> = ({ primaryColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const chars = containerRef.current.querySelectorAll('.char');

    // Initial state
    gsap.set(chars, { yPercent: 100 });

    const tl = gsap.timeline({
      repeat: -1,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 90%",
      }
    });

    // Phase 1: Reveal
    tl.to(chars, {
      yPercent: 0,
      stagger: 0.05,
      ease: "expo.out",
      duration: 1
    })
    // Phase 2: Pause
    .to({}, { duration: 3 })
    // Phase 3: Hide
    .to(chars, {
      yPercent: 100,
      stagger: 0.02,
      ease: "expo.inOut",
      duration: 0.5
    })
    // Phase 4: Interval
    .to({}, { duration: 2 });

  }, { scope: containerRef });

  const renderLine = (text: string, color?: string) => {
    return (
      <div className="flex justify-center flex-wrap" style={{ color }}>
        {text.split('').map((char, i) => (
          <span key={i} className="overflow-hidden inline-block">
            <span className="char inline-block whitespace-pre">
              {char === ' ' ? '\u00A0' : char}
            </span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="text-6xl md:text-8xl lg:text-[10rem] font-bold tracking-tighter mb-8 leading-none uppercase flex flex-col items-center w-full">
      {renderLine("LET'S WORK")}
      {renderLine("TOGETHER.", primaryColor)}
    </div>
  );
};
