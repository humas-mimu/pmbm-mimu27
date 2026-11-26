import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { fail, limited } from '@/lib/ratelimit';
import { cekRegistrant } from '@/lib/utils';
import { readJson } from '@/lib/http';
import { CAPTCHA_TTL_SEC, checkCaptchaAnswer, parseCaptchaToken } from '@/lib/captcha';
export const dynamic = 'force-dynamic';

// Cek pendaftaran publik: NIK siswa + soal pengaman (captcha). Soal hanya menahan bot; siapa pun yang tahu NIK anak
// dapat melihat data yang tampil di halaman (NIK orang tua & alamat tidak pernah dikirim — lihat cekRegistrant).
export async function POST(req) {
  if (await limited(req, 'cek', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  const parsed = await readJson(req, 2 * 1024);
  if (parsed.error === 'TOO_LARGE') return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 });
  const body = parsed.body || {};
  const nik = String(body.nik || '').replace(/\D/g, '');
  if (!/^\d{16}$/.test(nik)) {
    return NextResponse.json({ error: 'Isi NIK Siswa 16 digit dengan benar.' }, { status: 400 });
  }

  // Soal pengaman: token harus terbitan server & belum kedaluwarsa; tiap soal hanya SATU kali percobaan (benar maupun salah).
  const wrong = () => NextResponse.json(
    { error: 'Jawaban soal pengaman salah atau sudah kedaluwarsa. Silakan jawab soal yang baru.', code: 'CAPTCHA' }, { status: 400 });
  const tok = parseCaptchaToken(body.captcha_token);
  if (!tok) return wrong();
  if ((await fail(`captcha:${tok.nonce}`, 1, CAPTCHA_TTL_SEC + 60)).limited) return wrong();   // token & jawaban dipakai ulang
  if (!checkCaptchaAnswer(body.captcha_token, body.captcha_answer)) return wrong();

  const { data } = await db().from('registrants').select('*').eq('nik_siswa', nik).maybeSingle();
  if (!data) {
    return NextResponse.json({ error: 'Data pendaftaran tidak ditemukan. Periksa kembali NIK Siswa.' }, { status: 404 });
  }
  return NextResponse.json({ registrant: cekRegistrant(data) });
}
