import { NextResponse } from 'next/server';
import { getSettingImage } from '@/lib/settings';
import { dataImageResponse } from '@/lib/dataImage';
export const dynamic = 'force-dynamic';

// Menyajikan favicon hasil upload (disimpan di database). Bila belum ada, arahkan ke file bawaan.
export async function GET(req) {
  const res = dataImageResponse(await getSettingImage('favicon_url'), new URL(req.url).searchParams.has('v'));
  return res || NextResponse.redirect(new URL('/favicon.svg', req.url));
}
