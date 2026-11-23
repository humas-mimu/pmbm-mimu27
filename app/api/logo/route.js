import { NextResponse } from 'next/server';
import { getSettingImage } from '@/lib/settings';
import { dataImageResponse } from '@/lib/dataImage';
export const dynamic = 'force-dynamic';

// Menyajikan logo hasil upload (disimpan di database) sebagai gambar biasa agar tidak ikut tertanam di HTML setiap halaman.
export async function GET(req) {
  const res = dataImageResponse(await getSettingImage('logo_url'), new URL(req.url).searchParams.has('v'));
  return res || new NextResponse(null, { status: 404 });   // 404 -> komponen Logo otomatis memakai file bawaan di public/logo
}
