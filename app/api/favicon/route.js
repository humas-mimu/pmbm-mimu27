import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';

// Menyajikan favicon hasil upload (disimpan di database). Bila belum ada, arahkan ke file bawaan.
export async function GET(req) {
  const s = await getSettings();
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/.exec(s.favicon_url || '');
  if (!m) return NextResponse.redirect(new URL('/favicon.svg', req.url));
  return new NextResponse(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}
