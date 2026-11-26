import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/captcha';
export const dynamic = 'force-dynamic';

// Soal baru. Tanpa database & tanpa penyimpanan (token bertanda tangan), jadi murah dipanggil.
export async function GET() {
  try {
    const { question, token } = generateChallenge();   // jawaban sengaja tidak dikirim
    return NextResponse.json({ question, token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET /api/captcha:', e.message);
    return NextResponse.json({ error: 'Soal pengaman tidak tersedia.' }, { status: 500 });
  }
}
