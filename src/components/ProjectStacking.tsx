import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatTextWithAccent } from '../utils/formatText';

interface ProjectStackingProps {
  projects: any[];
  themeColor: string;
}

export const ProjectStacking: React.FC<ProjectStackingProps> = ({ projects, themeColor }) => {
  return (
    <div className="w-full relative z-20">
      {projects.map((project, index) => {
        // We use sticky top-0 to stack cards on top of each other naturally
        return (
          <div 
            key={project.id}
            className="group sticky top-0 w-full h-screen flex flex-col items-center justify-center overflow-hidden"
            style={{ zIndex: index + 1 }}
          >
            <div className="w-full pointer-events-none">
              <Link 
                to={`/work/${project.id}`}
                className="relative w-full aspect-video md:aspect-[21/9] max-h-[80vh] block overflow-hidden bg-zinc-950 isolate pointer-events-auto border-t border-b border-white/5 transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-[1.02]"
              >
                {/* Background Media */}
                <div className="absolute inset-0 w-full h-full">
                  {project.images?.[0]?.type === 'video' ? (
                    <video 
                      src={project.images[0].url || undefined} 
                      autoPlay loop muted playsInline 
                      className="w-full h-full object-cover opacity-60" 
                    />
                  ) : (
                    <img loading="lazy" 
                      src={project.images?.[0]?.url || undefined} 
                      alt={project.title} 
                      className="w-full h-full object-cover opacity-60"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  )}
                </div>
                
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/80 z-10 pointer-events-none" />
                
                {/* Project Title */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest glass text-zinc-200">
                      {project.role}
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-6 hover:scale-105 transition-transform duration-500 break-words w-full">
                    {formatTextWithAccent(project.title, themeColor)}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-3">
                    {project.tech?.slice(0, 3).map((t: string, i: number) => (
                      <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-700/50 px-3 py-1 rounded-full backdrop-blur-md bg-black/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

