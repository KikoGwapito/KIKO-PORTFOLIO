import React, { useEffect, useState } from 'react';
import { getEmbedInfo } from '../utils/embed';

export function SocialThumbnail({ url, className = "" }: { url: string, className?: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const info = getEmbedInfo(url);

  useEffect(() => {
    if (info.type === 'youtube') {
      setThumbUrl(info.thumbnail || null);
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
    }
  }, [url, info.type, info.thumbnail]);

  if (thumbUrl) {
    return <img loading="lazy" src={thumbUrl} alt={`${info.type} thumbnail`} className={className} />;
  }

  // Fallback for Facebook or when thumbnail is not loaded yet
  if (info.embedUrl) {
    return (
      <div className={`relative pointer-events-none overflow-hidden ${className}`}>
        <iframe
          src={info.type === 'youtube' ? `${info.embedUrl}?autoplay=0&controls=0` : info.embedUrl}
          className="absolute inset-0 w-full h-full object-cover scale-150"
          title={`${info.type} thumbnail fallback`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-zinc-900 ${className}`}>
      <span className="text-zinc-500 text-xs uppercase tracking-widest">{info.type}</span>
    </div>
  );
}
