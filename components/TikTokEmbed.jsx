'use client';
import { useEffect, useRef } from 'react';

// Embed TikTok dengan cara RESMI (blockquote + embed.js) agar parameter iframe selalu sesuai kebutuhan TikTok.
// DOM dibuat manual (di luar kendali React) karena embed.js mengganti isi blockquote.
export default function TikTokEmbed({ id, url }) {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !/^\d{8,25}$/.test(id)) return undefined;
    const bq = document.createElement('blockquote');
    bq.className = 'tiktok-embed';
    bq.setAttribute('cite', url);
    bq.setAttribute('data-video-id', id);
    const sec = document.createElement('section');
    const a = document.createElement('a');           // tampil bila embed.js diblokir (mis. oleh ekstensi pemblokir iklan)
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Tonton di TikTok ↗';
    sec.appendChild(a); bq.appendChild(sec);
    el.replaceChildren(bq);
    const s = document.createElement('script');
    s.src = 'https://www.tiktok.com/embed.js'; s.async = true;
    document.body.appendChild(s);
    return () => { s.remove(); el.replaceChildren(); };
  }, [id, url]);
  return <div ref={host} className="tiktok-host h-full w-full overflow-hidden" />;
}
