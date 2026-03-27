import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Lock, CheckCircle2, AlertCircle, Info, ArrowRight, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { LenisProvider } from './components/LenisProvider';
import { Magnetic } from './components/Magnetic';
import Home from './pages/Home';
import About from './pages/About';
import Process from './pages/Process';
import Contact from './pages/Contact';
import Project from './pages/Project';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Reviews from './pages/Reviews';
import SecurityOverlay from './components/SecurityOverlay';
import { useAppData } from './context/AppDataContext';
import { isConfigValid } from './firebase';
import { formatTextWithAccent } from './utils/formatText';

function ThemeToggle() {
  const { data } = useAppData();
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('portfolio_theme');
    const defaultMode = data.theme.defaultMode || 'dark';
    
    let isLight = false;
    if (savedTheme) {
      isLight = savedTheme === 'light';
    } else {
      isLight = defaultMode === 'light';
    }
    
    setIsLightMode(isLight);
    if (isLight) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [data.theme.defaultMode]);

  const toggleTheme = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('portfolio_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('portfolio_theme', 'dark');
    }
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed right-6 bottom-6 z-[100] w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all shadow-2xl no-invert"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle theme"
    >
      {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </motion.button>
  );
}

function FirebaseConfigBanner() {
  if (isConfigValid) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white py-2 px-4 z-[1000] text-center text-sm font-bold flex items-center justify-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>Firebase configuration is missing. Please set the VITE_FIREBASE_* secrets in the Settings menu.</span>
    </div>
  );
}

function NotificationToast() {
  const { notification } = useAppData();

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md"
          style={{
            backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                             notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                             'rgba(59, 130, 246, 0.1)',
            borderColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 
                         notification.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                         'rgba(59, 130, 246, 0.2)',
          }}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          <span className="font-medium text-sm text-zinc-100">{notification.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CustomCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { stiffness: 500, damping: 28, mass: 0.5 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  
  const ringX = useSpring(mouseX, { stiffness: 250, damping: 20, mass: 0.8 });
  const ringY = useSpring(mouseY, { stiffness: 250, damping: 20, mass: 0.8 });

  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const { data } = useAppData();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let trailId = 0;
    let idleTimeout: NodeJS.Timeout;

    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => setIsIdle(true), 5000);
    };

    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      resetIdle();
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button' || target.closest('a') || target.closest('button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      clearTimeout(idleTimeout);
    };
  }, []);

  if (isMobile) return null;

  return (
    <>
      {/* Main Cursor Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[99999] mix-blend-difference"
        style={{ 
          backgroundColor: data.theme.cursorColor || data.theme.primaryColor,
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%'
        }}
        animate={{
          scale: isClicking ? 0.5 : isHovering ? 2 : 1,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Cursor Ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border pointer-events-none z-[99998] mix-blend-difference"
        style={{ 
          borderColor: data.theme.cursorColor || data.theme.primaryColor,
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%'
        }}
        animate={
          isIdle 
            ? { scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }
            : {
                scale: isClicking ? 2 : isHovering ? 1.5 : 1,
                opacity: isClicking ? 0 : 1,
              }
        }
        transition={
          isIdle
            ? { scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }, opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
            : { duration: 0.2 }
        }
      />
    </>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const { data } = useAppData();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[1000] origin-left"
      style={{ 
        scaleX: scrollYProgress,
        backgroundColor: data.theme.primaryColor,
        boxShadow: `0 0 10px ${data.theme.primaryColor}`
      }}
    />
  );
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAdmin, data } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', data.theme.primaryColor);
  }, [data.theme.primaryColor]);

  useEffect(() => {
    // Force home page on refresh
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0 && navigationEntries[0].type === 'reload') {
      if (location.pathname !== '/' || !location.hash) {
        navigate('/#work');
      }
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <LenisProvider>
      <div className="min-h-screen text-zinc-50 font-sans cursor-none overflow-x-hidden relative" style={{ backgroundColor: data.theme.backgroundColor, '--color-primary': data.theme.primaryColor } as React.CSSProperties}>
        {/* Global Futuristic Background */}
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute inset-0 bg-grid-large opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
          

        </div>

        <FirebaseConfigBanner />
      <SecurityOverlay />
      <CustomCursor />
      <ScrollProgress />
      <ThemeToggle />

      <NotificationToast />
      
      {/* Navigation */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800/50" 
        style={{ backgroundColor: data.theme.headerColor ? `${data.theme.headerColor}cc` : 'rgba(9, 9, 11, 0.8)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" onClick={closeMenu} className="shrink-0">
            <motion.div 
              className="text-xl font-bold tracking-tighter flex items-center gap-2 origin-left"
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {data.pageTitle.logo && <img src={data.pageTitle.logo} alt="Logo" className="h-8 w-auto select-none pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />}
              <span className="inline-block truncate max-w-[150px] sm:max-w-none">{formatTextWithAccent(data.pageTitle.title, data.theme.primaryColor)}</span>
            </motion.div>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Magnetic strength={0.2}><Link to="/#work" className="hover:text-zinc-50 transition-colors">Work</Link></Magnetic>
            <Magnetic strength={0.2}><Link to="/about" className="hover:text-zinc-50 transition-colors">About</Link></Magnetic>
            <Magnetic strength={0.2}><Link to="/process" className="hover:text-zinc-50 transition-colors">Process</Link></Magnetic>
            <Magnetic strength={0.2}><Link to="/reviews" className="hover:text-zinc-50 transition-colors">Reviews</Link></Magnetic>
            <Magnetic strength={0.3}>
              <Link to="/contact">
                <motion.div 
                  className="px-5 py-2.5 rounded-full font-semibold text-zinc-50 glow-primary"
                  style={{ backgroundColor: data.theme.primaryColor }}
                  whileHover={{ scale: 1.05, opacity: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  Contact Me
                </motion.div>
              </Link>
            </Magnetic>
            <Magnetic strength={0.2}>
              <Link to={isAdmin ? "/admin" : "/admin/login"} title="Admin Login">
                <motion.div 
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-50"
                  whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 10, 0] }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Lock className="w-4 h-4" />
                </motion.div>
              </Link>
            </Magnetic>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <Link to={isAdmin ? "/admin" : "/admin/login"}>
              <motion.div 
                className="p-2 text-zinc-500 hover:text-zinc-50 transition-colors"
                whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 10, 0] }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 1.0 }}
              >
                <Lock className="w-4 h-4" />
              </motion.div>
            </Link>
            <button 
              className="p-2 text-zinc-400 hover:text-zinc-50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-zinc-800/50 backdrop-blur-md overflow-hidden"
              style={{ backgroundColor: data.theme.headerColor ? `${data.theme.headerColor}f2` : 'rgba(9, 9, 11, 0.95)' }}
            >
              <nav className="flex flex-col px-6 py-8 gap-8 text-2xl font-bold text-zinc-400">
                <Link to="/#work" onClick={closeMenu} className="hover:text-zinc-50 transition-colors flex items-center justify-between group">
                  <span>Work</span>
                  <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                </Link>
                <Link to="/about" onClick={closeMenu} className="hover:text-zinc-50 transition-colors flex items-center justify-between group">
                  <span>About</span>
                  <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                </Link>
                <Link to="/process" onClick={closeMenu} className="hover:text-zinc-50 transition-colors flex items-center justify-between group">
                  <span>Process</span>
                  <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                </Link>
                <Link to="/reviews" onClick={closeMenu} className="hover:text-zinc-50 transition-colors flex items-center justify-between group">
                  <span>Reviews</span>
                  <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                </Link>
                <div className="flex justify-end mt-4">
                  <Link to="/contact" onClick={closeMenu} className="px-8 py-4 rounded-full text-zinc-950 font-bold transition-all active:scale-95 text-lg" style={{ backgroundColor: data.theme.primaryColor }}>
                    Contact Me
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        <AnimatePresence mode="wait">
          {/* @ts-ignore */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/about" element={<PageTransition><About /></PageTransition>} />
            <Route path="/process" element={<PageTransition><Process /></PageTransition>} />
            <Route path="/reviews" element={<PageTransition><Reviews /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/work/:id" element={<PageTransition><Project /></PageTransition>} />
            <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
            <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <AnimatePresence mode="wait">
        <motion.footer 
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 1.2 / (data.theme.animationSpeed || 1), ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden pt-32 pb-12 mt-20 border-t border-zinc-800/50" 
          style={{ backgroundColor: data.theme.footerColor || '#09090b' }}
        >
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-24">
              <div>
                <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 leading-none">
                  Let's work <br />
                  <span style={{ color: data.theme.primaryColor }}>together.</span>
                </h2>
                <Link 
                  to="/contact" 
                  className="inline-flex items-center gap-4 text-xl md:text-2xl font-medium hover:opacity-80 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: data.theme.primaryColor }}>
                    <ArrowRight className="w-6 h-6 text-zinc-950 -rotate-45" />
                  </div>
                  Get in touch
                </Link>
              </div>
              
              <div className="flex flex-col gap-4">
                <h3 className="text-zinc-500 font-medium uppercase tracking-widest text-sm mb-2">Socials</h3>
                {data.contact.socials?.map((link, i) => (
                  <a 
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-medium hover:text-zinc-300 transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" style={{ color: data.theme.primaryColor }} />
                    {link.platform}
                  </a>
                ))}
              </div>
            </div>

            <div className="w-full h-[1px] bg-zinc-800/50 mb-8" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                {data.pageTitle.logo && <img src={data.pageTitle.logo} alt="Logo" className="h-6 w-auto grayscale opacity-50 select-none pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />}
                <span className="truncate max-w-[200px] sm:max-w-none">{formatTextWithAccent(data.pageTitle.title, data.theme.primaryColor)}</span>
              </div>
              <div className="flex items-center gap-8 text-zinc-500 text-sm font-medium">
                <Link to="/#" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
                <Link to="/#" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
              </div>
              <div className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} All rights reserved.
              </div>
            </div>
          </div>
        </motion.footer>
      </AnimatePresence>
      </div>
    </LenisProvider>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 1.2 / speed, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Shutter reveal effect */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{ duration: 0.8 / speed, ease: [0.76, 0, 0.24, 1] }}
        style={{ backgroundColor: data.theme.primaryColor, originY: 0 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      />
      {children}
    </motion.div>
  );
}
