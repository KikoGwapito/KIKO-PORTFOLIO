import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Monitor } from 'lucide-react';

interface GoogleDriveDesktopPlayerProps {
  previewUrl: string;
  directViewUrl: string;
  title?: string;
  className?: string;
}

export function GoogleDriveDesktopPlayer({
  previewUrl,
  directViewUrl,
  title = "Google Drive video player",
  className = ""
}: GoogleDriveDesktopPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  // 960x540 is the optimal reference desktop canvas for Google Drive's full desktop UI
  const DESKTOP_WIDTH = 960;
  const DESKTOP_HEIGHT = 540;

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
        if (width > 0 && width < DESKTOP_WIDTH) {
          setScale(width / DESKTOP_WIDTH);
        } else {
          setScale(1);
        }
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  const isScaled = scale < 1 && containerWidth > 0;
  const computedHeight = isScaled ? Math.round(DESKTOP_HEIGHT * scale) : undefined;

  return (
    <div 
      className={`w-full max-w-5xl flex flex-col items-center justify-center mx-auto ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Outer Scaled Viewport Container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto touch-auto select-none"
        style={{
          height: computedHeight ? `${computedHeight}px` : undefined,
          maxHeight: '80vh'
        }}
      >
        {isScaled ? (
          <div
            style={{
              width: `${DESKTOP_WIDTH}px`,
              height: `${DESKTOP_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="touch-auto"
          >
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full border-0 touch-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              loading="eager"
            />
          </div>
        ) : (
          <iframe
            src={previewUrl}
            title={title}
            className="w-full h-full border-0 absolute inset-0 touch-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="eager"
          />
        )}
      </div>

      {/* Sub-bar with Desktop Mode indicator & direct Drive link */}
      <div className="flex items-center justify-between w-full px-1 pt-2.5 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] sm:text-xs">
          <Monitor className="w-3.5 h-3.5 text-zinc-400" />
          <span>Desktop Player Mode</span>
        </div>

        <a 
          href={directViewUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg transition-colors border border-white/10 text-xs font-medium shadow-md active:scale-95 ml-auto"
        >
          <span>Open in Drive</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </div>
    </div>
  );
}
