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

    // Phase 1: Reveal from bottom
    tl.to(chars, {
      yPercent: 0,
      stagger: 0.04,
      ease: "power4.out",
      duration: 1.2
    })
    // Phase 2: Pause
    .to({}, { duration: 3 })
    // Phase 3: Hide to top (smooth exit)
    .to(chars, {
      yPercent: -100,
      stagger: 0.02,
      ease: "power4.inOut",
      duration: 0.8
    })
    // Phase 4: Reset instantly to bottom
    .set(chars, { yPercent: 100 })
    // Phase 5: Short interval before next loop
    .to({}, { duration: 0.2 });

  }, { scope: containerRef });

  const renderLine = (text: string, color?: string) => {
    return (
      <div className="flex justify-start flex-wrap" style={{ color }}>
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
    <div ref={containerRef} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 leading-none uppercase flex flex-col items-start">
      {renderLine("LET'S WORK")}
      {renderLine("TOGETHER.", primaryColor)}
    </div>
  );
};
