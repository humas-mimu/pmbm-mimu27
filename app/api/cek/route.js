import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { limited } from '@/lib/ratelimit';
import { publicRegistrant } from '@/lib/utils';
export const dynamic = 'force-dynamic';

// 2 faktor: (NIK siswa ATAU ID pendaftaran) + tanggal lahir. Hanya data milik sendiri.
export async function POST(req) {
  if (limited(req, 'cek', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const q = String(body.query || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const dob = String(body.dob || '').trim();
  if (!q || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return NextResponse.json({ error: 'Isi NIK/ID Pendaftaran dan tanggal lahir.' }, { status: 400 });
  }
  const { data } = await db()
    .from('registrants')
    .select('*')
    .or(`nik_siswa.eq.${q},registration_id.eq.${q}`)
    .eq('tanggal_lahir', dob)
    .limit(1)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: 'Data tidak ditemukan. Periksa kembali NIK/ID dan tanggal lahir.' }, { status: 404 });
  }
  return NextResponse.json({ registrant: publicRegistrant(data) });
}
