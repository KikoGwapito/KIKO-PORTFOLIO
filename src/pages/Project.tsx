import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, animate, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, Pause, Maximize, ExternalLink, Calendar, User, Cpu, MousePointer2, SplitSquareHorizontal } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import ComparisonSlider from '../components/ComparisonSlider';
import { Magnetic } from '../components/Magnetic';
import { ImageViewer } from '../components/ImageViewer';

function VideoPlayer({ src, autoPlay }: { src: string, autoPlay?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [autoPlay]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const toggleFullScreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full group cursor-pointer bg-black/50 overflow-hidden flex items-center justify-center rounded-[2.5rem]`} 
      onClick={togglePlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video 
        ref={videoRef}
        src={src || undefined} 
        loop 
        playsInline 
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={handleTimeUpdate}
        onPlay={(e) => {
          setIsPlaying(true);
          const currentVideo = e.currentTarget;
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            if (video !== currentVideo && !video.paused) {
              video.pause();
            }
          });
        }}
        onPause={() => setIsPlaying(false)}
        className={`w-full h-full object-contain transition-transform duration-700`}
      />
      
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${isPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="w-20 h-20 glass rounded-full flex items-center justify-center text-white border border-white/10 shadow-2xl transition-colors duration-300">
          <Play className="w-8 h-8 ml-1" fill="currentColor" />
        </div>
      </div>

      <div 
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-3 ${(isHovered || !isPlaying) ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          ref={progressRef}
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden relative"
          onClick={handleProgressClick}
        >
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-white">
          <button onClick={togglePlay} className="p-1 hover:scale-110 transition-transform" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>
          <button onClick={toggleFullScreen} className="p-1 hover:scale-110 transition-transform" aria-label="Toggle Fullscreen">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaModal({ media, onClose }: { media: any, onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if ((window as any).lenis) (window as any).lenis.stop();
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
      if ((window as any).lenis) (window as any).lenis.start();
    };
  }, []);

  if (!media) return null;

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/90 overflow-hidden"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full h-full max-h-[100vh] flex items-center justify-center pointer-events-auto p-4 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'video' ? (
          <VideoPlayer src={media.url} autoPlay />
        ) : media.type === 'comparison' ? (
          <div className="w-full h-full flex items-center justify-center">
            <ComparisonSlider 
              beforeUrl={media.url || ''} 
              afterUrl={media.secondUrl || ''} 
              objectFit="contain"
              className="w-full h-full object-contain rounded-[2.5rem] overflow-hidden shadow-2xl bg-black"
            />
          </div>
        ) : (
          <img
            src={media.url}
            alt="fullscreen"
            className="w-full h-full object-contain rounded-[2.5rem] shadow-2xl"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

function Carousel3D({ items, onMediaClick }: { items: any[], onMediaClick: (media: any) => void }) {
  const rotation = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const animationRef = useRef<any>(null);

  // Minimum 10 items to show 5 on the front side
  let displayItems = [...items];
  while (displayItems.length < 10) {
    const needed = 10 - displayItems.length;
    displayItems = [...displayItems, ...items.slice(0, needed)];
  }

  const handlePanStart = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    setIsDragging(true);
    isDraggingRef.current = true;
  };

  const handlePan = (e: any, info: any) => {
    rotation.set(rotation.get() - info.delta.x * 0.1);
  };

  const handlePanEnd = (e: any, info: any) => {
    animationRef.current = animate(rotation, rotation.get() - info.velocity.x * 0.05, {
      type: "spring",
      stiffness: 50,
      damping: 20,
      mass: 1
    });
    setTimeout(() => {
      setIsDragging(false);
      isDraggingRef.current = false;
    }, 50);
  };

  const numItems = displayItems.length;
  // 2:3 ratio
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const itemWidth = isMobile ? 240 : 360;
  const itemHeight = isMobile ? 360 : 540;
  // Increase distance between containers
  const radius = Math.round((itemWidth / 2) / Math.tan(Math.PI / numItems)) + 40;

  return (
    <div 
      className="relative w-full max-w-full overflow-hidden my-32 flex items-center justify-center pointer-events-none" 
      style={{ perspective: '2000px', height: itemHeight + 100 }}
    >
      {/* Floating Drag Instruction */}
      <motion.div 
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass px-6 py-3 rounded-full flex gap-3 items-center pointer-events-none"
        animate={{ 
          opacity: isDragging ? 0 : 1, 
          y: isDragging ? -20 : [0, -5, 0],
          scale: isDragging ? 0.9 : 1
        }}
        transition={{ 
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
          y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <div className="w-6 h-6 flex items-center justify-center">
          <MousePointer2 className="w-5 h-5 text-zinc-400" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">Drag to move</span>
      </motion.div>

      <motion.div 
        className="relative flex items-center justify-center pointer-events-none mt-10"
        style={{ 
          rotateY: rotation, 
          transformStyle: "preserve-3d",
          width: itemWidth,
          height: itemHeight
        }}
      >
        {displayItems.map((item, i) => {
          const angle = i * (360 / numItems);
          return (
            <motion.div 
              key={i} 
              className="absolute w-full h-full rounded-[2rem] overflow-hidden border border-zinc-800/50 shadow-2xl glass transition-transform cursor-grab active:cursor-grabbing pointer-events-auto"
              style={{ 
                transform: `rotateY(${angle}deg) translateZ(-${radius}px)`,
                backfaceVisibility: 'hidden'
              }}
              onPanStart={handlePanStart}
              onPan={handlePan}
              onPanEnd={handlePanEnd}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDraggingRef.current) {
                  onMediaClick(item);
                }
              }}
            >
              {item.type === 'video' ? (
                <video 
                  src={`${item.url}#t=1`} 
                  preload="metadata"
                  muted playsInline 
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none" 
                />
              ) : item.type === 'comparison' ? (
                <>
                  <img src={item.url} alt="Comparison" draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full z-10 flex items-center gap-2 border border-white/10 pointer-events-none">
                    <SplitSquareHorizontal className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Compare</span>
                  </div>
                </>
              ) : (
                <img src={item.url} alt="Media" draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
              )}
              
              {/* Overlay Play/View Icon */}
              <div className="absolute inset-0 bg-zinc-950/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center text-white scale-90 transition-transform duration-300">
                  {item.type === 'video' ? <Play className="w-6 h-6 ml-1" fill="currentColor" /> : <Maximize className="w-6 h-6" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function Project() {
  const { id } = useParams<{ id: string }>();
  const { data } = useAppData();
  const location = useLocation();
  const project = id ? data.projects[id] : null;
  const [activeMedia, setActiveMedia] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const speed = data.theme.animationSpeed || 1;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    // Ensure scroll to top on initial load
    window.scrollTo(0, 0);
    if ((window as any).lenis) {
      (window as any).lenis.scrollTo(0, { immediate: true });
    }

    if (location.state?.openMediaIndex !== undefined && project) {
      const index = location.state.openMediaIndex;
      const media = project.images[index];
      
      setTimeout(() => {
        setActiveMedia(media);
      }, 500);
    }
  }, [location.state, project, location.pathname]);

  if (!project) {
    return (
      <div ref={containerRef} className="pt-40 pb-20 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-[90vh] flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Project not found</h1>
        <Link to="/" className="text-zinc-400 hover:text-white flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pb-40 min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <div className="h-[90vh] relative overflow-hidden flex items-end pb-24 px-6">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">
          {project.images[0]?.type === 'video' ? (
            <video 
              src={project.images[0].url} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover scale-110"
            />
          ) : (
            <img 
              src={project.images[0]?.url || "https://picsum.photos/seed/project/1920/1080"} 
              alt={project.title}
              className="w-full h-full object-cover scale-110"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        </motion.div>

        <div className="w-full px-4 md:px-8 lg:px-12 mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 30 }}
            animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
            transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
          >
            <Magnetic strength={0.1} className="inline-block">
              <Link to="/#work" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-12 group">
                <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Back to Projects</span>
              </Link>
            </Magnetic>
            
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-bold tracking-tighter leading-[0.8] mb-8">
              {formatTextWithAccent(project.title, data.theme.primaryColor)}
            </h1>
            
            <p className="text-2xl md:text-4xl text-zinc-300 max-w-4xl leading-tight tracking-tight">
              {formatTextWithAccent(project.description, data.theme.primaryColor)}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        {/* Info Grid */}
        <motion.div 
          initial={{ opacity: 0, filter: "blur(10px)", y: 40 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
          className="grid md:grid-cols-4 gap-12 py-24 border-b border-zinc-800/50 mb-24"
        >
          <div className="md:col-span-2 min-w-0">
            <div className="flex items-center gap-3 mb-6 flex-wrap sm:flex-nowrap">
              <span className="w-8 h-[1px] bg-zinc-800 shrink-0"></span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 break-words min-w-0">The Brief</span>
            </div>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-xl break-words">{formatTextWithAccent(project.longDescription, data.theme.primaryColor)}</p>
          </div>

          <div className="space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-4 text-zinc-500">
                <User className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Role</span>
              </div>
              <div className="text-xl font-bold text-zinc-100">{project.role}</div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4 text-zinc-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Timeline</span>
              </div>
              <div className="text-xl font-bold text-zinc-100">{project.timeline}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6 text-zinc-500">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Technologies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t: string, i: number) => (
                <span key={i} className="px-4 py-2 rounded-full glass border border-zinc-800/50 text-sm font-bold text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Gallery */}
        <Carousel3D items={project.images} onMediaClick={(media) => setActiveMedia(media)} />
        
        {/* Next Project CTA */}
        <div className="mt-40 pt-40 border-t border-zinc-800/50 text-center">
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 40 }}
            whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-12">Ready to create something <span style={{ color: data.theme.primaryColor }}>extraordinary?</span></h2>
            <Magnetic strength={0.1} className="inline-block">
              <Link 
                to="/contact" 
                className="inline-flex items-center gap-4 px-12 py-6 text-zinc-950 font-bold rounded-full transition-all group relative overflow-hidden shadow-[0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                style={{ backgroundColor: data.theme.primaryColor }}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-4 text-xl">
                  Start a Project
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
                </span>
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </div>
              </Link>
            </Magnetic>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {activeMedia && (
          (!activeMedia.type || activeMedia.type === 'image') ? (
            <ImageViewer src={activeMedia.url} alt="media" isOpen={!!activeMedia} onClose={() => setActiveMedia(null)} />
          ) : (
            <MediaModal media={activeMedia} onClose={() => setActiveMedia(null)} />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
