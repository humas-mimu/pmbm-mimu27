import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { cleanRegistrant } from '@/lib/validate';
export const dynamic = 'force-dynamic';

const bool = (v) => !!v;

export async function PATCH(req, { params }) {
  const auth = await requireUser(['ADMIN', 'GURU']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  let patch;

  switch (b.action) {
    case 'checklist':
      patch = { is_akta_kelahiran: bool(b.is_akta_kelahiran), is_ktp_ortu: bool(b.is_ktp_ortu), is_kk: bool(b.is_kk) };
      break;
    case 'cancel':
      patch = { status: 'CANCELLED', cancel_reason: String(b.reason || '').trim().slice(0, 500) || null };
      break;
    case 'restore':
      patch = { status: 'ACTIVE', cancel_reason: null };
      break;
    case 'update': {
      const { data, errors } = cleanRegistrant(b);
      if (Object.keys(errors).length) return NextResponse.json({ error: 'Data belum lengkap / valid.', errors }, { status: 422 });
      patch = {
        ...data,
        is_akta_kelahiran: bool(b.is_akta_kelahiran), is_ktp_ortu: bool(b.is_ktp_ortu), is_kk: bool(b.is_kk),
      };
      break;
    }
    default:
      return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
  }

  const { data: saved, error } = await db()
    .from('registrants').update({ ...patch, updated_at: now }).eq('id', params.id).select().maybeSingle();
  if (error) {
    if (error.code === '23505') {
      const { data: dup } = await db().from('registrants')
        .select('nama_siswa,registration_id,program_kelas,created_at').eq('nik_siswa', patch.nik_siswa).maybeSingle();
      return NextResponse.json({ error: 'NIK_DUPLICATE', duplicate: dup }, { status: 409 });
    }
    console.error('PATCH /api/registrants:', error);
    const hint = /nik_wali/.test(error.message || '') ? ' Database belum diperbarui: jalankan supabase/migrations/001_nik_wali_favicon.sql di Supabase SQL Editor.' : '';
    return NextResponse.json({ error: `Gagal memperbarui data.${hint}` }, { status: 500 });
  }
  if (!saved) return NextResponse.json({ error: 'Data tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ registrant: saved });
}
