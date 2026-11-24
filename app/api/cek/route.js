import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { limited } from '@/lib/ratelimit';
import { cekRegistrant } from '@/lib/utils';
import { normalizeRegistrationId } from '@/lib/regid';
export const dynamic = 'force-dynamic';

// 2 faktor: ID Pendaftaran (acak, hanya ada di tiket) + NIK siswa. Keduanya harus cocok pada SATU baris.
// Pencarian hanya dengan NIK atau hanya dengan ID tidak tersedia. Pesan gagal sama untuk semua kasus.
export async function POST(req) {
  if (limited(req, 'cek', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const id = normalizeRegistrationId(body.id);
  const nik = String(body.nik || '').replace(/\D/g, '');
  if (!id || !/^\d{16}$/.test(nik)) {
    return NextResponse.json({ error: 'Isi ID Pendaftaran (lihat di tiket) dan NIK Siswa 16 digit dengan benar.' }, { status: 400 });
  }
  const { data } = await db()
    .from('registrants')
    .select('*')
    .eq('registration_id', id)
    .eq('nik_siswa', nik)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: 'ID Pendaftaran dan NIK tidak cocok. Periksa kembali tiket Anda.' }, { status: 404 });
  }
  return NextResponse.json({ registrant: cekRegistrant(data) });
}
