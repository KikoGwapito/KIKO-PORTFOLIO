import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'motion/react';
import { ArrowRight, Play, MousePointer2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { ProjectStacking } from '../components/ProjectStacking';
import { ProcessParallax } from '../components/ProcessParallax';
import { Magnetic } from '../components/Magnetic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function TrustSectionScroll({ data, speed }: { data: any, speed: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"] // triggers sticky
  });

  // 0.0 to 0.33 -> Left block slides in
  const leftX = useTransform(scrollYProgress, [0, 0.33], ["-50%", "0%"]);
  const leftOpacity = useTransform(scrollYProgress, [0.1, 0.33], [0, 1]);

  // 0.33 to 0.66 -> Right block slides in
  const rightX = useTransform(scrollYProgress, [0.33, 0.66], ["50%", "0%"]);
  const rightOpacity = useTransform(scrollYProgress, [0.4, 0.66], [0, 1]);

  const [charsShown, setCharsShown] = useState(0);
  const quoteText = data.trust.quote || "";

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.66) {
      setCharsShown(0);
    } else {
      const ratio = Math.min(1, Math.max(0, (latest - 0.66) / 0.34));
      setCharsShown(Math.floor(ratio * quoteText.length));
    }
  });

  return (
    <section ref={containerRef} className="h-[300vh] border-y border-zinc-800/30 relative">
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        
        <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT BLOCK: Trusted by */}
            <motion.div
              style={{ x: leftX, opacity: leftOpacity }}
              className="min-w-0 w-full"
            >
              <div className="flex items-center gap-3 mb-8 flex-wrap sm:flex-nowrap">
                <span className="w-8 h-[1px] shrink-0" style={{ backgroundColor: data.theme.primaryColor }}></span>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 break-words min-w-0">{formatTextWithAccent(data.trust.label || 'Trusted by innovative teams', data.theme.primaryColor)}</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8 break-words">
                {formatTextWithAccent(data.trust.title || data.trust.heading, data.theme.primaryColor)}
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed max-w-xl break-words">
                {formatTextWithAccent(data.trust.subheading, data.theme.primaryColor)}
              </p>
              
              {/* Logos */}
              <div className="mt-12 w-full overflow-hidden">
                <div className="marquee-container">
                  <div className="marquee-track gap-4">
                    {[...data.trust.logos, ...data.trust.logos, ...data.trust.logos].map((logo: any, i: number) => {
                      const logoSrc = typeof logo === 'object' && logo !== null ? logo.image : logo;
                      const isImage = typeof logoSrc === 'string' && (logoSrc.startsWith('http') || logoSrc.includes('.'));
                      
                      return (
                        <div key={i} className="relative group/logo cursor-pointer overflow-hidden rounded-full px-8 py-4 bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 transition-all duration-500 hover:border-white/20 hover:from-white/[0.12] shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
                          <div className="absolute inset-0 w-full h-full opacity-0 group-hover/logo:opacity-20 transition-opacity duration-500 ease-[0.22,1,0.36,1]" style={{ backgroundColor: data.theme.primaryColor }} />
                          <div className="absolute inset-0 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                          </div>
                          <div className="relative z-10 flex items-center justify-center h-full grayscale opacity-50 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 transition-all duration-500 drop-shadow-md">
                            {isImage ? (
                              <img 
                                src={logoSrc} 
                                alt={`Partner ${i + 1}`} 
                                className="h-8 w-auto object-contain select-none pointer-events-none"
                                referrerPolicy="no-referrer"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                              />
                            ) : (
                              <span className="text-sm font-bold tracking-widest uppercase group-hover/logo:text-zinc-950 transition-colors duration-500 text-white">{logoSrc}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT BLOCK: Quote */}
            <motion.div 
              style={{ x: rightX, opacity: rightOpacity }}
              className="relative mt-12 md:mt-0 min-w-0 w-full"
            >
              <div className="absolute -top-8 -left-2 md:-top-10 md:-left-10 text-[6rem] md:text-[12rem] font-serif italic text-zinc-800/20 pointer-events-none select-none leading-none">"</div>
              <blockquote className="text-xl md:text-3xl font-medium leading-snug md:leading-tight tracking-tight text-zinc-100 mb-8 md:mb-10 relative z-10 break-words min-h-[120px]">
                {quoteText.substring(0, charsShown)}
                <motion.span 
                  animate={{ opacity: [1, 0, 1] }} 
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block translate-y-1 ml-1"
                  style={{ color: data.theme.primaryColor }}
                >_</motion.span>
              </blockquote>
              <div className="flex items-center gap-4 md:gap-5 relative z-10 flex-wrap sm:flex-nowrap">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700/50 p-1 shrink-0">
                  <img src={data.trust.authorImage || undefined} alt={data.trust.authorName} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl grayscale select-none pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-zinc-50 text-base md:text-lg break-words">{data.trust.authorName}</div>
                  <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500 break-words">{data.trust.authorRole}</div>
                </div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!mediaRef.current || !spacerRef.current || !overlayRef.current || !contentRef.current) return;
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: spacerRef.current,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1,
        }
      });

      // Phase 1: Expand width and remove border radius
      tl.to(mediaRef.current, {
        width: '100%',
        borderRadius: '0px',
        ease: 'none',
        duration: 0.7
      })
      // Phase 2: Expand height to full screen
      .to(mediaRef.current, {
        height: '100vh',
        ease: 'none',
        duration: 0.3
      });

      // Phase 3: Blur and darken the media when content scrolls over
      gsap.to(overlayRef.current, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top bottom',
          end: 'top center',
          scrub: 1,
        }
      });

      // Refresh ScrollTrigger to ensure all positions are correct after the complex sticky layout settles
      ScrollTrigger.refresh();
    }, scrollContainerRef);
    
    return () => ctx.revert();
  }, []);
  
  return (
    <div>
      {/* Hero Section */}
      <section ref={containerRef} className="relative pt-32 sm:pt-40 pb-20 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-[90vh] flex flex-col justify-center overflow-hidden">
        <div className="flex flex-col items-center text-center relative z-10 min-w-0 w-full">
          <motion.div style={{ y: heroTextY }} className="max-w-4xl mx-auto min-w-0 w-full">
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: -20 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex items-center justify-center gap-2 mb-6 flex-wrap sm:flex-nowrap w-full"
            >
              <span className="w-8 h-[1px] shrink-0" style={{ backgroundColor: data.theme.primaryColor }}></span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 break-words min-w-0">{formatTextWithAccent(data.hero.label || 'Digital Architect', data.theme.primaryColor)}</span>
              <span className="w-8 h-[1px] shrink-0" style={{ backgroundColor: data.theme.primaryColor }}></span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, filter: "blur(10px)", y: 30 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8 break-words w-full"
            >
              {formatTextWithAccent(data.hero.title, data.theme.primaryColor)}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              transition={{ duration: 1.2 / speed, delay: 0.1 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg sm:text-xl text-zinc-400 mb-12 leading-relaxed max-w-2xl mx-auto break-words w-full"
            >
              {formatTextWithAccent(data.hero.subtitle, data.theme.primaryColor)}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
              animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              transition={{ duration: 1.2 / speed, delay: 0.2 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8"
            >
              <Magnetic strength={0.3} className="w-full sm:w-auto">
                <Link 
                  to={data.hero.buttonLink} 
                  className="group w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 bg-zinc-950/40 text-zinc-50 border border-white/10 font-bold rounded-full overflow-hidden transition-all flex items-center justify-center gap-3 backdrop-blur-xl hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] glow-top-edge-hover relative"
                >
                  <div 
                    className="absolute inset-0 z-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 ease-[0.22,1,0.36,1]"
                    style={{ backgroundColor: data.theme.primaryColor }}
                  />
                  
                  {/* Hover light reflection */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                  </div>

                  <span className="relative z-10 drop-shadow-md">{data.hero.buttonText}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10 drop-shadow-md" />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </div>

                  {/* Subtle glow effect on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                    style={{ backgroundColor: data.theme.primaryColor }}
                  />
                </Link>
              </Magnetic>
              
              <Magnetic strength={0.2}>
                <Link to={data.hero.secondaryButtonLink} className="text-zinc-400 hover:text-zinc-50 font-medium transition-colors flex items-center gap-3 group">
                  <span className="w-10 h-[1px] bg-zinc-800 group-hover:w-14 group-hover:bg-zinc-50 transition-all duration-500"></span>
                  {data.hero.secondaryButtonText}
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* GSAP ScrollTrigger Hero Media Section */}
      <div ref={scrollContainerRef} className="w-full relative z-20">
        <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden z-0">
          <div 
            ref={mediaRef} 
            className="hero-media overflow-hidden bg-zinc-900 shadow-2xl relative flex items-center justify-center"
            style={{ 
              width: '60%', 
              height: '80vh', 
              borderRadius: '40px',
              willChange: 'width, height, border-radius'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60 z-20 pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-20 z-10 pointer-events-none" />
            
            <div className="w-full h-full">
              {data.hero.media.type === 'video' ? (
                <video 
                  src={data.hero.media.url || undefined} 
                  autoPlay loop muted playsInline 
                  className="w-full h-full object-cover grayscale-hover transition-transform duration-1000"
                />
              ) : (
                <img 
                  src={data.hero.media.url || undefined} 
                  alt="Hero" 
                  className="w-full h-full object-cover select-none grayscale-hover transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </div>
          
            {/* Floating Badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 glass px-4 py-3 sm:px-6 sm:py-4 rounded-2xl flex items-center gap-3 sm:gap-4"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: data.theme.primaryColor }}>
                <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {data.hero.floatingText?.split('\n')[0] || 'AVAILABLE FOR'}
                </div>
                <div className="text-xs sm:text-sm font-bold">
                  {data.hero.floatingText?.split('\n').slice(1).join('\n') || 'New Projects'}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Overlay to darken/blur the image when content scrolls over */}
          <div ref={overlayRef} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xl opacity-0 z-40 pointer-events-none" />
        </div>

        {/* Spacer for the expansion animation */}
        <div ref={spacerRef} className="h-[150vh] w-full pointer-events-none" />

        {/* Content that scrolls over the hero media */}
        <div ref={contentRef} className="relative z-10 w-full">
          {/* Trust Section */}
          <TrustSectionScroll data={data} speed={speed} />

      {/* Process Section */}
      <motion.div
        initial={{ opacity: 0, filter: "blur(15px)" }}
        whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ProcessParallax 
          steps={data.process.steps} 
          primaryColor={data.theme.primaryColor}
          title={data.process.title}
          subtitle={data.process.subtitle}
          label={data.process.label || 'How I Work'}
        />
      </motion.div>

      {/* Featured Work Header */}
      <section className="py-24 relative z-20">
    <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
      <motion.div 
        initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
        whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-8 min-w-0"
      >
        <div className="min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-3 mb-6 flex-wrap sm:flex-nowrap">
            <span className="w-12 h-[1px] bg-zinc-800 shrink-0"></span>
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 break-words min-w-0">{formatTextWithAccent(data.featuredWork.label || 'Portfolio', data.theme.primaryColor)}</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none break-words">
            {formatTextWithAccent(data.featuredWork.title, data.theme.primaryColor)}
          </h2>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 shrink-0">
          <span className="text-sm font-bold uppercase tracking-[0.3em]">Selected Projects</span>
          <div className="w-20 h-[1px] bg-zinc-800"></div>
        </div>
      </motion.div>
    </div>
  </section>

      {/* Featured Work Projects */}
      <section id="work" className="relative z-20 bg-transparent">
        {(() => {
      const validProjects = (data.projectOrder || []).map(id => ({ ...data.projects[id], id })).filter(p => p.title);
      return (
        <ProjectStacking 
          key={`stack-${validProjects.map(p => p.id).join('-')}`}
          projects={validProjects} 
          themeColor={data.theme.primaryColor} 
        />
      );
    })()}
      </section>
      
      </div>
    </div>
    
    {/* View All CTA - Moved outside of scrollContainerRef so liquid background shows! */}
    <div className="w-full px-4 md:px-8 lg:px-12 mx-auto pb-40 relative z-10 bg-transparent">
      <motion.div 
        initial={{ opacity: 0, filter: "blur(10px)", y: 30 }}
        whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
        viewport={{ once: false }}
        className="mt-40 flex flex-col items-center text-center"
      >
          <h3 className="text-4xl md:text-6xl font-bold tracking-tighter mb-12 max-w-2xl leading-none">
            Ready to start your next <span style={{ color: data.theme.primaryColor }}>digital revolution?</span>
          </h3>
          <Magnetic strength={0.4} className="inline-block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/contact" 
                className="group relative px-8 py-4 md:px-12 md:py-6 rounded-[2rem] bg-zinc-950/40 text-zinc-50 border border-white/10 font-bold text-lg md:text-xl overflow-hidden transition-all flex items-center gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-xl hover:border-white/20 glow-top-edge-hover"
              >
                <div 
                  className="absolute inset-0 z-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 ease-[0.22,1,0.36,1]"
                  style={{ backgroundColor: data.theme.primaryColor }}
                />
                
                {/* Hover light reflection */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                </div>

                <span className="relative z-10 drop-shadow-md">Let's Collaborate</span>
                <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform duration-500 drop-shadow-md" />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2rem]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </div>

                {/* Subtle glow effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                  style={{ backgroundColor: data.theme.primaryColor }}
                />
              </Link>
            </motion.div>
          </Magnetic>
        </motion.div>
      </div>
      
  </div>
  );
}
