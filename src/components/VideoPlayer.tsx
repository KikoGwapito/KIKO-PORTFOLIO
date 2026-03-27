import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize } from 'lucide-react';

export function VideoPlayer({ src, className = "", autoPlay = false, muted = false }: { src: string, className?: string, autoPlay?: boolean, muted?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
    }
  }, [autoPlay]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
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
    e.preventDefault();
    e.stopPropagation();
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const toggleFullScreen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        if (window.screen && window.screen.orientation && videoRef.current && videoRef.current.videoWidth > videoRef.current.videoHeight) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch (err) {
            console.log('Orientation lock failed', err);
          }
        }
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
      className={`relative w-full group cursor-pointer bg-black overflow-hidden flex items-center justify-center ${className}`} 
      onClick={togglePlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video 
        ref={videoRef}
        src={src ? (src.includes('#t=') ? src : `${src}#t=10.001`) : undefined} 
        loop 
        playsInline
        autoPlay={autoPlay}
        muted={muted}
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
        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
      />
      
      {/* Center Play Button */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${isPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="w-16 h-16 bg-zinc-950/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-2xl group-hover:bg-emerald-500/90 group-hover:border-emerald-400/50 transition-colors duration-300">
          <Play className="w-6 h-6 ml-1" fill="currentColor" />
        </div>
      </div>

      {/* Bottom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-2 ${(isHovered || !isPlaying) ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer overflow-hidden relative"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 bottom-0 bg-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <button onClick={togglePlay} className="p-1 hover:text-emerald-400 transition-colors">
            {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>
          <button onClick={toggleFullScreen} className="p-1 hover:text-emerald-400 transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
