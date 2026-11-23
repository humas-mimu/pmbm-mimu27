import { NextResponse } from 'next/server';

const RE = /^data:(image\/(?:png|jpeg|svg\+xml|webp));base64,(.+)$/;

// Mengubah data-URL gambar (logo/favicon dari Settings) menjadi respons gambar biasa.
// `versioned` = alamat membawa ?v=<versi> -> aman di-cache selamanya (versi baru = alamat baru).
// Header CSP sandbox + nosniff: bila yang diunggah SVG, skripnya tidak dapat berjalan walau alamatnya dibuka langsung.
export function dataImageResponse(dataUrl, versioned) {
  const m = RE.exec(dataUrl || '');
  if (!m) return null;
  return new NextResponse(Buffer.from(m[2], 'base64'), {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': versioned ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
