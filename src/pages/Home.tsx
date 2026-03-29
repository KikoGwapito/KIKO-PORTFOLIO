import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ArrowRight, Play, MousePointer2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { ProjectStacking } from '../components/ProjectStacking';
import { Magnetic } from '../components/Magnetic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function ProcessStepCard({ step, index, themeColor }: { step: any, index: number, themeColor: string, key?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className="glass p-10 rounded-[2.5rem] border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-500 group relative overflow-hidden cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="absolute top-0 right-0 p-8 text-6xl font-bold text-zinc-800/20 group-hover:text-zinc-800/40 transition-colors duration-500">
        0{index + 1}
      </div>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
      </div>
      <h3 className="text-2xl font-bold mb-4 group-hover:glow-text transition-all duration-500 flex items-center gap-4">
        {formatTextWithAccent(step.title, themeColor)}
        <motion.span 
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-xs opacity-30"
        >
          ▼
        </motion.span>
      </h3>
      
      <AnimatePresence>
        {isOpen && (
          <motion.p 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-zinc-400 leading-relaxed overflow-hidden"
          >
            {formatTextWithAccent(step.description, themeColor)}
          </motion.p>
        )}
      </AnimatePresence>
      
      {!isOpen && (
        <p className="text-zinc-500 text-sm italic opacity-50">Click to read more...</p>
      )}
      
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" style={{ backgroundImage: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }} />
    </motion.div>
  );
}



export default function Home() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!mediaRef.current || !scrollContainerRef.current) return;
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerRef.current,
          start: 'top top',
          end: '+=200%', // 200vh scroll track
          scrub: 1, // 1 second catch-up smoothing
          pin: true,
        }
      });

      // Phase 1: Expand width and remove border radius
      tl.to(mediaRef.current, {
        width: '100%',
        borderRadius: '0px',
        ease: 'none',
        duration: 0.7 // Takes up first 70% of the scroll
      })
      // Phase 2: Expand height to full screen
      .to(mediaRef.current, {
        height: '100vh',
        ease: 'none',
        duration: 0.3 // Takes up remaining 30%
      });
    }, scrollContainerRef);
    
    return () => ctx.revert();
  }, []);
  
  return (
    <div>
      {/* Hero Section */}
      <section ref={containerRef} className="relative pt-32 sm:pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-[90vh] flex flex-col justify-center overflow-hidden">
        <div className="flex flex-col items-center text-center relative z-10">
          <motion.div style={{ y: heroTextY }} className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <span className="w-8 h-[1px]" style={{ backgroundColor: data.theme.primaryColor }}></span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{formatTextWithAccent(data.hero.label || 'Digital Architect', data.theme.primaryColor)}</span>
              <span className="w-8 h-[1px]" style={{ backgroundColor: data.theme.primaryColor }}></span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8"
            >
              {formatTextWithAccent(data.hero.title, data.theme.primaryColor)}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 / speed, delay: 0.1 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg sm:text-xl text-zinc-400 mb-12 leading-relaxed max-w-2xl mx-auto"
            >
              {formatTextWithAccent(data.hero.subtitle, data.theme.primaryColor)}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 / speed, delay: 0.2 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8"
            >
              <Magnetic strength={0.3} className="w-full sm:w-auto">
                <Link to={data.hero.buttonLink} className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 text-zinc-950 font-bold rounded-full transition-all flex items-center justify-center gap-3 group glow-primary relative overflow-hidden" style={{ backgroundColor: data.theme.primaryColor }}>
                  <span className="relative z-10">{data.hero.buttonText}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                  <motion.div 
                    className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                  />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </div>
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
      <div ref={scrollContainerRef} className="scroll-container w-full h-screen relative z-20 flex items-center justify-center">
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
      </div>


      {/* Trust Section */}
      <section className="py-24 border-y border-zinc-800/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="w-8 h-[1px]" style={{ backgroundColor: data.theme.primaryColor }}></span>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{formatTextWithAccent(data.trust.label || 'Trusted by innovative teams', data.theme.primaryColor)}</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
                {formatTextWithAccent(data.trust.title || data.trust.heading, data.theme.primaryColor)}
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed max-w-xl">
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
                        <div key={i} className="relative group/logo cursor-pointer overflow-hidden rounded-full px-8 py-4 bg-zinc-900 border border-zinc-800 transition-all duration-500 hover:border-zinc-700 shrink-0">
                          <div className="absolute inset-0 w-full h-full -translate-x-full group-hover/logo:translate-x-0 transition-transform duration-500 ease-[0.22,1,0.36,1]" style={{ backgroundColor: data.theme.primaryColor }} />
                          <div className="relative z-10 flex items-center justify-center h-full grayscale opacity-50 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 transition-all duration-500">
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

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2 / speed, delay: 0.2 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -top-10 -left-10 text-[12rem] font-serif italic text-zinc-800/20 pointer-events-none select-none">"</div>
              <blockquote className="text-2xl md:text-3xl font-medium leading-tight tracking-tight text-zinc-100 mb-10 relative z-10">
                {data.trust.quote}
              </blockquote>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700/50 p-1">
                  <img src={data.trust.authorImage || undefined} alt={data.trust.authorName} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl grayscale select-none pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div>
                  <div className="font-bold text-zinc-50 text-lg">{data.trust.authorName}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">{data.trust.authorRole}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-40 px-6 max-w-7xl mx-auto relative overflow-hidden">
        <div className="flex flex-col items-center text-center mb-24">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-12 h-[1px] bg-zinc-800"></span>
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500">{formatTextWithAccent(data.process.label || 'How I Work', data.theme.primaryColor)}</span>
            <span className="w-12 h-[1px] bg-zinc-800"></span>
          </div>
          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none mb-8">
            {formatTextWithAccent(data.process.title, data.theme.primaryColor)}
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
            {formatTextWithAccent(data.process.subtitle, data.theme.primaryColor)}
          </p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(data.process.steps.length, 4)} gap-8`}>
          {[...data.process.steps].reverse().map((step, i) => (
            <ProcessStepCard key={i} step={step} index={i} themeColor={data.theme.primaryColor} />
          ))}
        </div>
      </section>

      {/* Featured Work */}
      <section id="work" className="py-40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col md:flex-row items-start md:items-end justify-between mb-24 gap-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-[1px] bg-zinc-800"></span>
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500">{formatTextWithAccent(data.featuredWork.label || 'Portfolio', data.theme.primaryColor)}</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
                {formatTextWithAccent(data.featuredWork.title, data.theme.primaryColor)}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-zinc-500">
              <span className="text-sm font-bold uppercase tracking-[0.3em]">Selected Projects</span>
              <div className="w-20 h-[1px] bg-zinc-800"></div>
            </div>
          </motion.div>
        </div>

        <ProjectStacking 
          projects={(data.projectOrder || []).map(id => ({ ...data.projects[id], id })).filter(p => p.title)} 
          themeColor={data.theme.primaryColor} 
        />
        
        {/* View All CTA */}
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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
                className="group relative px-8 py-4 md:px-12 md:py-6 rounded-full bg-zinc-50 text-zinc-950 font-bold text-lg md:text-xl overflow-hidden transition-all flex items-center gap-4 shadow-[0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <div 
                  className="absolute inset-0 z-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.22,1,0.36,1]"
                  style={{ backgroundColor: data.theme.primaryColor }}
                />
                <span className="relative z-10">Let's Collaborate</span>
                <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform duration-500" />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
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
      </section>
    </div>
  );
}
