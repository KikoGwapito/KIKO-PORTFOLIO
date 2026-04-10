import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { formatTextWithAccent } from '../utils/formatText';

gsap.registerPlugin(ScrollTrigger);

interface HorizontalProcessScrollProps {
  title?: string;
  subtitle?: string;
  steps: { title: string; description: string; image?: string; }[];
  media: any[];
  themeColor: string;
  transparentBg?: boolean;
}

export const HorizontalProcessScroll: React.FC<HorizontalProcessScrollProps> = ({ title, subtitle, steps, media, themeColor, transparentBg = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cardsData = [
    { 
      isTitleCard: true, 
      title: title || 'Process', 
      description: subtitle || '',
      image: media && media.length > 0 ? media[0]?.url : `https://picsum.photos/seed/process-title/800/1200`
    },
    ...[...steps].reverse().map((s, i) => ({ 
      ...s, 
      isTitleCard: false,
      image: s.image || (media && media.length > 0 ? media[(i + 1) % media.length]?.url : `https://picsum.photos/seed/process${i + 10}/800/1200`)
    }))
  ];

  useGSAP(() => {
    if (!containerRef.current || !scrollRef.current) return;

    const cards = gsap.utils.toArray('.process-card', scrollRef.current);
    const N = cardsData.length;
    
    // Adjusted mobile spacing to match desktop proportions
    const dx = window.innerWidth > 768 ? 400 : 260;
    const dy = window.innerWidth > 768 ? 250 : 160;
    
    const scrollDistance = window.innerHeight * Math.max(3, N * 0.8);
    const unpackRatio = 0.15;

    // Calculate snap points for magnetic effect
    const snapPoints = [0];
    for (let i = 0; i < N; i++) {
      snapPoints.push(unpackRatio + (i / Math.max(1, N - 1)) * (1 - unpackRatio));
    }
    
    // Initial reveal animation
    gsap.from(cards, {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.05,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      }
    });

    // Main scroll timeline
    gsap.to(containerRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        scrub: 1,
        start: "top top",
        end: () => "+=" + scrollDistance,
        invalidateOnRefresh: true,
        snap: {
          snapTo: snapPoints,
          duration: { min: 0.2, max: 0.6 },
          ease: "power1.inOut"
        },
        onUpdate: (self) => {
          const progress = self.progress;
          
          // 0 to 0.15 is unpack, 0.15 to 1.0 is browse
          const unpackProgress = Math.min(1, progress / unpackRatio);
          const easedUnpack = 1 - Math.pow(1 - unpackProgress, 3); // easeOutCubic

          const browseProgress = Math.max(0, (progress - unpackRatio) / (1 - unpackRatio));
          const t = browseProgress * Math.max(1, N - 1);

          cards.forEach((card: any, i) => {
            const inner = card.querySelector('.card-inner');
            if (!inner) return;
            
            // Calculate base position
            const current_x = (i * dx * easedUnpack) - (t * dx);
            const current_y = (i * dy * easedUnpack) - (t * dy);
            
            const normDist = current_x / dx; 
            
            // Box opening effect: Title card lifts up slightly during unpack
            const isTitle = i === 0;
            const boxLift = isTitle ? Math.sin(unpackProgress * Math.PI) * -30 : 0;
            
            // Stack effect: when packed, cards are slightly offset in Z and Y
            const packZ = (1 - easedUnpack) * (-i * 15);
            const packY = (1 - easedUnpack) * (i * 4);
            
            gsap.set(card, {
              x: current_x,
              y: current_y + boxLift + packY,
              zIndex: N - i,
            });
            
            gsap.set(inner, {
              rotateZ: normDist * 8, 
              rotateY: normDist * -20, 
              rotateX: isTitle ? (unpackProgress * 15 - normDist * 5) : (normDist * 5),
              scale: 1 - Math.abs(normDist) * 0.15,
              z: -Math.abs(normDist) * 120 + packZ
            });

            // Grayscale and opacity
            const img = card.querySelector('.bg-image');
            const content = card.querySelector('.card-content');
            
            const grayVal = Math.min(1, Math.max(0, Math.abs(normDist) * 1.5));
            
            if (img) {
              gsap.set(img, { 
                filter: `grayscale(${grayVal * 100}%)`,
                opacity: 1 - (grayVal * 0.4)
              });
            }
            
            if (content) {
              gsap.set(content, {
                opacity: 1 - Math.abs(normDist) * 0.8
              });
            }
          });
        }
      }
    });

    // Fix for first load ScrollTrigger bug (recalculates after images/layout settle)
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 100);
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 500);
    const t3 = setTimeout(() => ScrollTrigger.refresh(), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };

  }, { scope: containerRef, dependencies: [cardsData.length] });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const wrapper = card.querySelector('.card-hover-wrapper');
    if (!wrapper) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Increased rotation for more noticeable 3D effect
    const rotateX = ((y - centerY) / centerY) * -25;
    const rotateY = ((x - centerX) / centerX) * 25;

    gsap.to(wrapper, {
      rotateX,
      rotateY,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 1000,
    });

    const glare = wrapper.querySelector('.glare') as HTMLElement;
    if (glare) {
      gsap.to(glare, {
        x: x - rect.width,
        y: y - rect.height,
        opacity: 1,
        duration: 0.4,
      });
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const wrapper = card.querySelector('.card-hover-wrapper');
    if (!wrapper) return;

    gsap.to(wrapper, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.7,
      ease: "power3.out",
    });

    const glare = wrapper.querySelector('.glare') as HTMLElement;
    if (glare) {
      gsap.to(glare, {
        opacity: 0,
        duration: 0.7,
      });
    }
  };

  return (
    <div ref={containerRef} className={`h-screen w-full overflow-hidden flex flex-col justify-center relative z-20 ${transparentBg ? 'bg-transparent' : 'bg-zinc-950'}`} style={{ perspective: '2000px' }}>
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center pointer-events-none">
        <div ref={scrollRef} className="relative w-full h-full flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
          {cardsData.map((step, index) => {
            return (
              <div 
                key={index} 
                className="process-card absolute w-[280px] md:w-[450px] aspect-[3/4] flex-shrink-0 origin-center pointer-events-auto"
                style={{ transformStyle: 'preserve-3d', zIndex: cardsData.length - index }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="card-inner w-full h-full relative rounded-3xl shadow-2xl pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                  <div 
                    className="card-hover-wrapper w-full h-full relative rounded-3xl overflow-hidden border border-zinc-800/50 bg-zinc-900 cursor-pointer pointer-events-auto"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Enhanced glare effect */}
                    <div className="glare absolute w-[200%] h-[200%] top-0 left-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rounded-full pointer-events-none opacity-0 z-50" style={{ mixBlendMode: 'overlay' }} />

                    {/* Background Image */}
                    <div className="absolute inset-0 w-full h-full bg-zinc-950 pointer-events-none">
                      <img 
                        src={step.image} 
                        alt={step.title} 
                        className="bg-image w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onLoad={() => ScrollTrigger.refresh()}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    </div>

                    {/* Content */}
                    {step.isTitleCard ? (
                      <div className="card-content absolute inset-0 p-8 md:p-10 flex flex-col justify-center items-center text-center z-10 bg-zinc-900/95 backdrop-blur-xl border-[6px] border-zinc-800/80 rounded-3xl pointer-events-none" style={{ transform: 'translateZ(50px)' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl pointer-events-none" />
                        <div className="flex items-center gap-3 mb-6 flex-wrap sm:flex-nowrap justify-center">
                          <span className="w-8 h-[1px] bg-zinc-500 shrink-0"></span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 break-words min-w-0">Process</span>
                          <span className="w-8 h-[1px] bg-zinc-500 shrink-0"></span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white drop-shadow-lg">
                          {formatTextWithAccent(step.title, themeColor)}
                        </h2>
                        <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-light drop-shadow-md">
                          {step.description}
                        </p>
                      </div>
                    ) : (
                      <div className="card-content absolute inset-0 p-8 md:p-10 flex flex-col justify-end z-10 pointer-events-none" style={{ transform: 'translateZ(50px)' }}>
                        <div className="text-6xl md:text-8xl font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-zinc-100/50 to-zinc-900/20 select-none absolute top-8 right-8">
                          {index < 10 ? `0${index}` : index}
                        </div>
                        
                        <div className="w-12 h-1 mb-6" style={{ backgroundColor: themeColor }} />
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tighter text-white drop-shadow-lg">
                          {formatTextWithAccent(step.title, themeColor)}
                        </h3>
                        <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-light drop-shadow-md line-clamp-4">
                          {step.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
