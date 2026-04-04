import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Mail, Github, Linkedin, Twitter, Instagram, Youtube, Facebook, Music2, Link as LinkIcon } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { Magnetic } from '../components/Magnetic';

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

function ExperienceItem({ exp, index, themeColor }: { key?: React.Key, exp: any, index: number, themeColor: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className="relative pl-8 md:pl-16 cursor-pointer group"
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Timeline Dot */}
      <div 
        className={`absolute left-[-6px] top-2 w-3 h-3 rounded-full border-2 transition-all duration-500 z-10 ${isOpen ? 'scale-150' : 'scale-100'}`}
        style={{ borderColor: themeColor, backgroundColor: isOpen ? themeColor : '#09090b', boxShadow: isOpen ? `0 0 20px ${themeColor}` : 'none' }}
      />
      
      <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 shrink-0 w-32">
          {exp.month} {exp.year}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-zinc-100 group-hover:text-white transition-colors tracking-tight">{formatTextWithAccent(exp.role, themeColor)}</h3>
          <div className="text-lg font-bold transition-colors flex items-center gap-3" style={{ color: themeColor }}>
            <span className="w-4 h-[1px] bg-current opacity-30"></span>
            {formatTextWithAccent(exp.company, themeColor)}
          </div>
        </div>
        <div className="hidden md:block">
          <motion.div 
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-100 group-hover:border-zinc-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-90" />
          </motion.div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="md:ml-[10rem] pb-8">
              <p className="text-zinc-400 text-lg leading-relaxed break-words whitespace-pre-wrap max-w-2xl">
                <TypewriterText text={exp.description} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-0 left-8 md:left-16 right-0 h-[1px] bg-gradient-to-r from-zinc-900 to-transparent" />
    </motion.div>
  );
}

export default function About() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  
  return (
    <div ref={containerRef} className="pt-40 pb-40 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-[90vh] relative">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-grid opacity-10 pointer-events-none" />
      
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-24 items-start relative z-10">
        {/* Left Column - Image & Quick Links */}
        <div className="lg:col-span-5 lg:sticky lg:top-40 w-full">
          <Magnetic strength={0.05}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.5 / speed, ease: [0.22, 1, 0.36, 1] }}
              className="aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-zinc-800/50 mb-12 relative group shadow-2xl"
            >
              <motion.div style={{ y: imageY }} className="absolute inset-0">
                <img 
                  src={data.about.image || "https://picsum.photos/seed/developer/800/800"} 
                  alt="Profile" 
                  className="w-full h-full object-cover select-none grayscale-hover scale-110"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60 z-10" />
              
              <div className="absolute bottom-8 left-8 z-20">
                <div className="text-xs font-bold uppercase tracking-[0.5em] text-zinc-400 mb-2">
                  {formatTextWithAccent(data.about.floatingText?.split('\n')[0] || 'BASED IN', data.theme.primaryColor)}
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {formatTextWithAccent(data.about.floatingText?.split('\n').slice(1).join('\n') || 'Earth, Digital Space', data.theme.primaryColor)}
                </div>
              </div>
            </motion.div>
          </Magnetic>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 / speed, delay: 0.2 / speed, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <Magnetic strength={0.1} className="block w-full">
              <a href={`mailto:${data.contact.email}`} className="flex items-center justify-between group p-6 rounded-3xl glass border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-500 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Get in touch</div>
                    <div className="font-bold text-zinc-100 group-hover:glow-text transition-all duration-500">{data.contact.email}</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-800 group-hover:text-zinc-500 transition-colors" />
              </a>
            </Magnetic>

            <div className="grid grid-cols-4 gap-4">
              {data.contact.socials?.map((social, i) => {
                let Icon = LinkIcon;
                const platformLower = social.platform.toLowerCase();
                if (platformLower.includes('linkedin')) Icon = Linkedin;
                else if (platformLower.includes('twitter') || platformLower.includes('x')) Icon = Twitter;
                else if (platformLower.includes('github')) Icon = Github;
                else if (platformLower.includes('instagram')) Icon = Instagram;
                else if (platformLower.includes('youtube')) Icon = Youtube;
                else if (platformLower.includes('facebook')) Icon = Facebook;
                else if (platformLower.includes('tiktok')) Icon = Music2;
                
                return (
                  <Magnetic strength={0.2} key={i} className="block w-full h-full">
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center w-full h-full aspect-square rounded-2xl glass border border-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all duration-500 group">
                      <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </a>
                  </Magnetic>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-7 w-full min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 / speed, delay: 0.3 / speed, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 w-full"
          >
            <div className="flex items-center gap-3 mb-8 flex-wrap sm:flex-nowrap">
              <span className="w-12 h-[1px] bg-zinc-800 shrink-0"></span>
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 break-words min-w-0">{formatTextWithAccent(data.about.label || 'About Me', data.theme.primaryColor)}</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-12 break-words w-full">
              {formatTextWithAccent(data.about.title, data.theme.primaryColor)}
            </h1>
            
            <div className="space-y-12 text-zinc-400">
              {data.about.content.map((paragraph, i) => (
                <motion.p 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={i === 0 ? "text-3xl md:text-4xl text-zinc-100 font-medium leading-tight tracking-tight mb-12" : "text-xl leading-relaxed max-w-2xl"}
                >
                  {formatTextWithAccent(paragraph, data.theme.primaryColor)}
                </motion.p>
              ))}
            </div>

            {/* Experience Timeline */}
            {data.about.experience && data.about.experience.length > 0 && (
              <div className="mt-40">
                <div className="flex items-center justify-between mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Experience</h2>
                  <div className="flex items-center gap-4 text-zinc-500">
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Timeline</span>
                    <div className="w-20 h-[1px] bg-zinc-800"></div>
                  </div>
                </div>
                <div className="relative border-l border-zinc-800/50 ml-1 space-y-0 pb-8">
                  {data.about.experience.map((exp, i) => (
                    <ExperienceItem key={exp.id} exp={exp} index={i} themeColor={data.theme.primaryColor} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
