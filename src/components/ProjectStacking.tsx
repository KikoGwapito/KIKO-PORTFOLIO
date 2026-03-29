import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { formatTextWithAccent } from '../utils/formatText';

gsap.registerPlugin(ScrollTrigger);

interface ProjectStackingProps {
  projects: any[];
  themeColor: string;
}

export function ProjectStacking({ projects, themeColor }: ProjectStackingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const cards = gsap.utils.toArray('.project-card') as HTMLElement[];
    const cardsToAnimate = cards.slice(1); // Skip the first card

    // Set initial position for cards to animate
    gsap.set(cardsToAnimate, { yPercent: 100 });

    if (cardsToAnimate.length === 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        start: 'top top',
        end: `+=${projects.length * 100}%`, // Scroll distance based on number of projects
        scrub: 1,
      }
    });

    // Animate each card sliding up one after another
    cardsToAnimate.forEach((card) => {
      tl.to(card, {
        yPercent: 0,
        ease: 'none'
      });
    });

  }, { scope: containerRef });

  return (
    <div id="project-stack-container" ref={containerRef} className="relative w-full h-screen overflow-hidden bg-zinc-950">
      {projects.map((project, index) => {
        return (
          <div 
            key={project.id}
            className="project-card absolute top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden"
            style={{ zIndex: index + 1 }}
          >
            <Link 
              to={`/work/${project.id}`}
              className="relative w-full h-full flex items-center justify-center overflow-hidden block"
            >
              {/* Background Media */}
              <div className="absolute inset-0 w-full h-full">
                {project.images[0]?.type === 'video' ? (
                  <video 
                    src={project.images[0].url ? (project.images[0].url.includes('#t=') ? project.images[0].url : `${project.images[0].url}#t=10.001`) : undefined} 
                    autoPlay loop muted playsInline 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img 
                    src={project.images[0]?.url || undefined} 
                    alt={project.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
              </div>
              
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/80 z-10 pointer-events-none" />
              
              {/* Project Title */}
              <div className="relative z-20 w-full px-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest glass text-zinc-200">
                    {project.role}
                  </span>
                </div>
                <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-6 hover:scale-105 transition-transform duration-500">
                  {formatTextWithAccent(project.title, themeColor)}
                </h2>
                <div className="flex flex-wrap justify-center gap-3">
                  {project.tech?.slice(0, 3).map((t: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-700/50 px-3 py-1 rounded-full backdrop-blur-md">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
