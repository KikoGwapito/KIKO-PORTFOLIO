import React, { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
if (typeof window !== 'undefined') {
  (window as any).ScrollTrigger = ScrollTrigger;
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    (window as any).lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Ensure all ScrollTriggers are refreshed after Lenis takes over
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        // Handle local #anchor, /#anchor, and /homeport#anchor links
        if (href && (href.startsWith('#') || href.startsWith('/#') || href.startsWith('/homeport#'))) {
          const isHome = window.location.pathname === '/' || window.location.pathname === '/homeport';
          // If navigating to home hash from a different page, allow react router to perform page navigation first
          if (!href.startsWith('#') && !isHome) {
            return;
          }
          const hashIdx = href.indexOf('#');
          const targetId = hashIdx !== -1 ? href.substring(hashIdx) : null;
          if (targetId && targetId !== '#') {
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
              e.preventDefault();
              const targetUrl = href.startsWith('/homeport') ? href : `/homeport${targetId}`;
              window.history.pushState(null, '', targetUrl);
              lenis.scrollTo(targetEl as HTMLElement, { 
                duration: 1.2,
                onComplete: () => {
                  // After scrolling to a hash, ensure ScrollTrigger is synchronized
                  ScrollTrigger.refresh();
                  // Second scroll to handle late layout shifts
                  setTimeout(() => {
                    lenis.scrollTo(targetEl as HTMLElement, { duration: 0.5 });
                  }, 1000);
                }
              });
            }
          }
        }
      }
    };
    
    document.addEventListener('click', handleHashClick);

    return () => {
      document.removeEventListener('click', handleHashClick);
      clearTimeout(refreshTimeout);
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
