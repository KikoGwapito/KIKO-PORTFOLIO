import React, { useEffect, useState } from 'react';
import { getEmbedInfo } from '../utils/embed';

interface SocialThumbnailProps {
  url: string;
  customThumbnail?: string;
  className?: string;
  autoPlay?: boolean;
}

export function SocialThumbnail({ url, customThumbnail, className = "", autoPlay = true }: SocialThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(customThumbnail || null);
  const [attemptIndex, setAttemptIndex] = useState<number>(0);
  const [streamError, setStreamError] = useState<boolean>(false);
  const info = getEmbedInfo(url);

  // Generate candidate list for thumbnails
  const getCandidates = (type: string, id?: string, primaryThumb?: string): string[] => {
    if (customThumbnail) return [customThumbnail];
    if (type === 'gdrive' && id) {
      return [
        `https://lh3.googleusercontent.com/d/${id}`,
        `/api/gdrive-thumbnail?id=${id}`,
        `https://drive.google.com/thumbnail?id=${id}&sz=w1920`,
        `https://drive.google.com/thumbnail?id=${id}&sz=w1000`
      ];
    }
    if (type === 'youtube' && id) {
      return [
        `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${id}/0.jpg`
      ];
    }
    if (primaryThumb) return [primaryThumb];
    return [];
  };

  useEffect(() => {
    setStreamError(false);
    if (customThumbnail) {
      setThumbUrl(customThumbnail);
      return;
    }

    setAttemptIndex(0);
    const candidates = getCandidates(info.type, info.id, info.thumbnail);
    if (candidates.length > 0) {
      setThumbUrl(candidates[0]);
    } else if (info.type === 'tiktok') {
      fetch(`/api/oembed?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.thumbnail_url) {
            setThumbUrl(data.thumbnail_url);
          }
        })
        .catch(() => {});
    } else if (info.type === 'instagram') {
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.data && data.data.image && data.data.image.url) {
            setThumbUrl(data.data.image.url);
          }
        })
        .catch(() => {});
    } else {
      setThumbUrl(null);
    }
  }, [url, customThumbnail, info.type, info.id, info.thumbnail]);

  const handleImageError = () => {
    const candidates = getCandidates(info.type, info.id, info.thumbnail);
    const nextIdx = attemptIndex + 1;
    if (nextIdx < candidates.length) {
      setAttemptIndex(nextIdx);
      setThumbUrl(candidates[nextIdx]);
    } else {
      setThumbUrl(null);
    }
  };

  // Google Drive video autoplay stream
  if (autoPlay && info.type === 'gdrive' && info.id && !streamError) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <video 
          src={`/api/gdrive-stream?id=${info.id}`}
          poster={thumbUrl || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setStreamError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // YouTube video autoplay preview
  if (autoPlay && info.type === 'youtube' && info.id) {
    return (
      <div className={`relative overflow-hidden pointer-events-none ${className}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${info.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${info.id}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&fs=0`}
          className="absolute inset-0 w-[160%] h-[160%] -top-[30%] -left-[30%] object-cover pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="YouTube thumbnail preview"
          tabIndex={-1}
        />
        {thumbUrl && (
          <img 
            src={thumbUrl} 
            alt="YouTube thumbnail fallback" 
            className="absolute inset-0 w-full h-full object-cover -z-10" 
            loading="lazy" 
          />
        )}
      </div>
    );
  }

  if (thumbUrl) {
    return (
      <img 
        loading="lazy" 
        src={thumbUrl} 
        alt={`${info.type} thumbnail`} 
        className={className} 
        referrerPolicy="no-referrer"
        onError={handleImageError}
        draggable={false}
      />
    );
  }

  // Fallback when image thumbnail is not available or failed: render preview iframe
  if (info.embedUrl) {
    return (
      <div className={`relative pointer-events-none overflow-hidden ${className}`}>
        <iframe
          src={info.type === 'youtube' ? `${info.embedUrl}?autoplay=1&mute=1&controls=0` : info.embedUrl}
          className="absolute inset-0 w-full h-full object-cover scale-150 pointer-events-none"
          title={`${info.type} thumbnail fallback`}
          loading="lazy"
          allow="autoplay; fullscreen"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-zinc-900 ${className}`}>
      <span className="text-zinc-500 text-xs uppercase tracking-widest">{info.type}</span>
    </div>
  );
}
