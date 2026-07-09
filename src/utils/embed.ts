export type EmbedType = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'native';

export function getEmbedInfo(url: string | null | undefined): { type: EmbedType, embedUrl?: string, thumbnail?: string, id?: string } {
  if (!url) return { type: 'native' };

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : null;
    if (id) {
      return {
        type: 'youtube',
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
      };
    }
  }

  if (url.includes('tiktok.com')) {
    const match = url.match(/video\/(\d+)/);
    const id = match ? match[1] : null;
    if (id) {
      return {
        type: 'tiktok',
        id,
        embedUrl: `https://www.tiktok.com/embed/v2/${id}?autoplay=0`
      };
    }
  }

  if (url.includes('instagram.com')) {
    const match = url.match(/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : null;
    if (id) {
      return {
        type: 'instagram',
        id,
        embedUrl: `https://www.instagram.com/p/${id}/embed`
      };
    }
  }

  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    if (url.includes('/reel/') || url.includes('/video') || url.includes('fb.watch') || url.includes('/watch/')) {
       return {
         type: 'facebook',
         embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=1`
       };
    }
  }

  return { type: 'native' };
}

export function isSocialVideo(url: string | null | undefined) {
  return getEmbedInfo(url).type !== 'native';
}

