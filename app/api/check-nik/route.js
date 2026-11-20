import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { limited } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (limited(req, 'check-nik', 30)) return NextResponse.json({ exists: false }, { status: 429 });
  const nik = new URL(req.url).searchParams.get('nik') || '';
  if (!/^\d{16}$/.test(nik)) return NextResponse.json({ exists: false });
  const { data } = await db()
    .from('registrants')
    .select('nama_siswa,registration_id,program_kelas,created_at')
    .eq('nik_siswa', nik)
    .maybeSingle();
  return NextResponse.json(data ? { exists: true, data } : { exists: false });
}
