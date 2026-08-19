import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, ExternalLink } from 'lucide-react';
import { getEmbedInfo } from '../utils/embed';
import { InstagramEmbed, TikTokEmbed, FacebookEmbed, YouTubeEmbed } from 'react-social-media-embed';

export function VideoPlayer({ src, className = "", autoPlay = false, muted = false }: { src: string, className?: string, autoPlay?: boolean, muted?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const embedInfo = getEmbedInfo(src);
  const isSocial = embedInfo.type !== 'native';
  let embedUrl = embedInfo.embedUrl;
  
  if (embedInfo.type === 'youtube' && embedUrl) {
    embedUrl += `?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`;
  }

  useEffect(() => {
    if (autoPlay && videoRef.current && !isSocial) {
      videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
    }
  }, [autoPlay, isSocial]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isSocial) return; // Social iframe handles its own play/pause
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
      if (Number.isFinite(current) && Number.isFinite(duration) && duration > 0) {
        setProgress(Math.max(0, Math.min(100, (current / duration) * 100)));
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSocial) return;
    if (progressRef.current && videoRef.current) {
      const duration = videoRef.current.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const rect = progressRef.current.getBoundingClientRect();
      if (!rect.width || rect.width <= 0) return;
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pos * duration;
      if (Number.isFinite(targetTime) && targetTime >= 0 && targetTime <= duration) {
        try {
          videoRef.current.currentTime = targetTime;
        } catch (err) {
          console.warn("Could not set currentTime on video", err);
        }
      }
    }
  };

  const toggleFullScreen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        if (!isSocial && window.screen && window.screen.orientation && videoRef.current && videoRef.current.videoWidth > videoRef.current.videoHeight) {
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

  const renderSocialEmbed = () => {
    if (!src) return null;
    
    if (embedInfo.type === 'youtube' && embedInfo.id) {
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto">
            <iframe
              src={`https://www.youtube.com/embed/${embedInfo.id}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`}
              title="YouTube video player"
              className="w-full h-full border-0 absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    if (embedInfo.type === 'vimeo' && embedInfo.id) {
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto">
            <iframe
              src={`https://player.vimeo.com/video/${embedInfo.id}?autoplay=${autoPlay ? 1 : 0}`}
              title="Vimeo video player"
              className="w-full h-full border-0 absolute inset-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    if (embedInfo.type === 'gdrive' && embedInfo.id) {
      const gdriveUrl = embedInfo.embedUrl || `https://drive.google.com/file/d/${embedInfo.id}/preview`;
      const directViewUrl = `https://drive.google.com/file/d/${embedInfo.id}/view`;

      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-4 max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-5xl aspect-video h-[55vh] sm:h-[68vh] md:h-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto touch-auto">
            <iframe
              src={gdriveUrl}
              title="Google Drive video player"
              className="w-full h-full border-0 absolute inset-0 touch-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              loading="eager"
            />
          </div>

          <div className="flex items-center justify-between w-full max-w-5xl px-1 pt-2.5 text-xs text-zinc-400">
            <span className="truncate max-w-[160px] sm:max-w-xs text-zinc-400 font-mono text-[11px] sm:text-xs">Google Drive Stream</span>
            <a 
              href={directViewUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg transition-colors border border-white/10 text-xs font-medium shadow-md active:scale-95"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center pointer-events-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center max-w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900/50 border border-white/10 p-2 shadow-2xl">
          {embedInfo.type === 'instagram' && (
            <InstagramEmbed url={src} width={340} />
          )}
          {embedInfo.type === 'tiktok' && (
            <TikTokEmbed url={src} width={340} />
          )}
          {embedInfo.type === 'facebook' && (
            <FacebookEmbed url={src} width={340} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full group cursor-pointer bg-black/40 flex flex-col items-center justify-center pointer-events-auto ${className}`} 
      onClick={(e) => {
        e.stopPropagation();
        togglePlay(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSocial ? renderSocialEmbed() : (
        <>
          <video 
            ref={videoRef}
            src={src ? (src.includes('#t=') ? src : `${src}#t=0.001`) : undefined} 
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
            className="w-full h-full object-contain transition-transform duration-700 max-h-[85vh]"
          />
          
          {/* Center Play Button */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${isPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="w-16 h-16 bg-zinc-950/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-2xl group-hover:bg-emerald-500/90 group-hover:border-emerald-400/50 transition-colors duration-300">
              <Play className="w-6 h-6 ml-1" fill="currentColor" />
            </div>
          </div>

          {/* Bottom Controls */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-2 z-10 ${(isHovered || !isPlaying) ? 'opacity-100' : 'opacity-0'}`}
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
        </>
      )}
    </div>
  );
}
