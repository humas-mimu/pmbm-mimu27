import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { cleanSizes } from '@/lib/uniform';
export const dynamic = 'force-dynamic';

// Ubah daftar jenis ukuran seragam — KHUSUS ADMIN. Data siswa yang sudah memakai ukuran lama tidak ikut berubah.
export async function PUT(req) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) {
    const msg = auth.status === 403 ? 'Hanya Admin yang dapat mengubah jenis ukuran.' : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  const b = await req.json().catch(() => ({}));
  const { sizes, error: bad } = cleanSizes(b.sizes);
  if (bad) return NextResponse.json({ error: bad }, { status: 422 });

  const { error } = await db().from('school_settings')
    .upsert({ id: 1, uniform_sizes: sizes, updated_at: new Date().toISOString() });
  if (error) {
    console.error('PUT /api/uniform/sizes:', error);
    const hint = /uniform_sizes/.test(error.message || '') ? ' Database belum diperbarui: jalankan supabase/migrations/003_ukuran_seragam.sql di Supabase SQL Editor.' : '';
    return NextResponse.json({ error: `Gagal menyimpan jenis ukuran.${hint}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sizes });
}
