import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, Github, Linkedin, Twitter, Instagram, Youtube, Facebook, Music2, Send, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { Magnetic } from '../components/Magnetic';

export default function Contact() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate submission for visual feedback
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      await fetch(form.action, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="pt-40 pb-40 px-4 md:px-8 lg:px-12 w-full mx-auto min-h-[90vh] relative">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid-large opacity-5 pointer-events-none" />
      
      <div className="grid lg:grid-cols-2 gap-24 items-start relative z-10">
        {/* Left Column - Contact Info */}
        <motion.div 
          initial={{ opacity: 0, filter: "blur(10px)", x: -30 }}
          animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, x: 0 }}
          transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 w-full"
        >
          <div className="flex items-center gap-3 mb-8 flex-wrap sm:flex-nowrap">
            <span className="w-12 h-[1px] bg-zinc-800 shrink-0"></span>
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 break-words min-w-0">{formatTextWithAccent(data.contact.label || 'Connect', data.theme.primaryColor)}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8 break-words w-full">
            {formatTextWithAccent(data.contact.title, data.theme.primaryColor)}
          </h1>
          
          <p className="text-2xl text-zinc-400 mb-16 leading-tight tracking-tight max-w-md break-words w-full">
            {formatTextWithAccent(data.contact.subtitle, data.theme.primaryColor)}
          </p>

          <div className="space-y-12">
            <Magnetic strength={0.1} className="block">
              <a href={`mailto:${data.contact.email}`} className="group block">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 mb-4">Direct Mail</div>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-zinc-700 transition-colors" style={{ color: data.theme.primaryColor }}>
                    <Mail className="w-7 h-7" />
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-100 group-hover:glow-text transition-all duration-500 break-all">{data.contact.email}</div>
                </div>
              </a>
            </Magnetic>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 mb-8">Social Networks</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {data.contact.socials.map((social, idx) => {
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
                    <Magnetic strength={0.15} key={idx} className="block w-full">
                      <a href={social.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group p-4 rounded-2xl glass border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-500 w-full">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-300 group-hover:text-white transition-colors capitalize">{social.platform}</span>
                      </a>
                    </Magnetic>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Form */}
        <motion.div 
          initial={{ opacity: 0, filter: "blur(10px)", x: 30 }}
          animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, x: 0 }}
          transition={{ duration: 1.2 / speed, delay: 0.2 / speed, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-tr from-zinc-900/50 to-transparent rounded-[3rem] blur-2xl opacity-50 pointer-events-none" />
          
          <div className="relative glass border border-zinc-800/50 rounded-[2.5rem] p-6 sm:p-8 md:p-12 overflow-hidden">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8" 
                  action={`https://formsubmit.co/${data.contact.email}`} 
                  method="POST"
                  onSubmit={handleSubmit}
                >
                  <input type="hidden" name="_subject" value="New submission from Portfolio!" />
                  <input type="hidden" name="_captcha" value="false" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3">
                      <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">Identity</label>
                      <input 
                        type="text" 
                        id="name" 
                        name="name"
                        required
                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="space-y-3">
                      <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">Frequency</label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email"
                        required
                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                        placeholder="email@address.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">Objective</label>
                    <input 
                      type="text" 
                      id="subject" 
                      name="_subject"
                      required
                      className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                      placeholder="Project Inquiry"
                    />
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="message" className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">Transmission</label>
                    <textarea 
                      id="message" 
                      name="message"
                      required
                      rows={5}
                      className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all resize-none placeholder:text-zinc-700"
                      placeholder="Your message here..."
                    ></textarea>
                  </div>

                  <Magnetic strength={0.05} className="w-full">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full group relative overflow-hidden px-6 py-4 sm:px-8 sm:py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                      style={{ backgroundColor: data.theme.primaryColor, color: '#000' }}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                      <span className="relative z-10 flex items-center gap-3">
                        {isSubmitting ? 'Transmitting...' : 'Initiate Transmission'}
                        <Send className={`w-5 h-5 transition-transform duration-500 ${isSubmitting ? 'translate-x-10 opacity-0' : 'group-hover:translate-x-1 group-hover:-translate-y-1'}`} />
                      </span>
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                      </div>
                    </button>
                  </Magnetic>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, filter: "blur(10px)", scale: 0.9 }}
                  animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, scale: 1 }}
                  className="py-20 text-center space-y-8"
                >
                  <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto" style={{ color: data.theme.primaryColor }}>
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Transmission Successful</h2>
                    <p className="text-zinc-400 text-lg">Your message has been encoded and sent through the digital void. Expect a response soon.</p>
                  </div>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    Send another message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {data.contact.media && data.contact.media.length > 0 && (
        <div className="mt-40 grid grid-cols-1 md:grid-cols-2 gap-12">
          {data.contact.media.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, filter: "blur(10px)", y: 40 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" }, y: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 1.2 / speed, delay: (i * 0.1) / speed, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-zinc-800/50 relative group shadow-2xl"
            >
              {m.type === 'video' ? (
                <video src={m.url || undefined} autoPlay loop muted playsInline className="w-full h-full object-cover aspect-video" />
              ) : (
                <>
                  <img 
                    src={m.url || undefined} 
                    alt={`Contact media ${i + 1}`} 
                    className="w-full h-full object-cover aspect-video select-none pointer-events-none grayscale-hover transition-all duration-700 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <div 
                    className="absolute inset-0 z-10"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
