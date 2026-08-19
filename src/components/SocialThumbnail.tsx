import React, { useEffect, useState } from 'react';
import { getEmbedInfo } from '../utils/embed';

interface SocialThumbnailProps {
  url: string;
  customThumbnail?: string;
  className?: string;
}

export function SocialThumbnail({ url, customThumbnail, className = "" }: SocialThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(customThumbnail || null);
  const [attemptIndex, setAttemptIndex] = useState<number>(0);
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
          src={info.type === 'youtube' ? `${info.embedUrl}?autoplay=0&controls=0` : info.embedUrl}
          className="absolute inset-0 w-full h-full object-cover scale-150 pointer-events-none"
          title={`${info.type} thumbnail fallback`}
          loading="lazy"
          allow="autoplay; fullscreen"
        />
        {/* Subtle overlay to prevent interaction in thumbnail mode */}
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
