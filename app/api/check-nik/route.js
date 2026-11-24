import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { limited } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';

// Publik: hanya {exists} — tanpa nama, ID, atau tanggal (ID Pendaftaran bersifat rahasia).
// Petugas yang login juga menerima detailnya untuk membantu input offline.
export async function GET(req) {
  if (limited(req, 'check-nik', 30)) return NextResponse.json({ exists: false }, { status: 429 });
  const nik = new URL(req.url).searchParams.get('nik') || '';
  if (!/^\d{16}$/.test(nik)) return NextResponse.json({ exists: false });
  const { data } = await db()
    .from('registrants')
    .select('nama_siswa,registration_id,program_kelas,created_at')
    .eq('nik_siswa', nik)
    .maybeSingle();
  if (!data) return NextResponse.json({ exists: false });
  return NextResponse.json((await getUser()) ? { exists: true, data } : { exists: true });
}
