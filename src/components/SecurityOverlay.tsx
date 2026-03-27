import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function SecurityOverlay() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        setIsBlocked(true);
      }
      // Windows + Shift + S (Windows Snipping Tool)
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        setIsBlocked(true);
      }
      // Mac screenshot shortcuts (Cmd + Shift + 3/4/5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        setIsBlocked(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Attempt to detect screen capture API usage
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = async function (...args) {
        setIsBlocked(true);
        return originalGetDisplayMedia.apply(this, args);
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
      <h1 className="text-4xl font-bold text-zinc-50 mb-4">Security Warning</h1>
      <p className="text-xl text-zinc-400 max-w-2xl mb-8">
        Screenshots and screen recordings are restricted on this page to protect sensitive content. 
        Please respect the privacy and copyright of the materials presented here.
      </p>
      <button 
        onClick={() => setIsBlocked(false)}
        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-colors text-lg"
      >
        I Understand, Return to Site
      </button>
    </div>
  );
}
