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

// Hapus PERMANEN — KHUSUS ADMIN (untuk data spam / bekas percobaan). Guru hanya bisa mengarsipkan (PATCH action 'cancel').
export async function DELETE(_req, { params }) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) {
    const msg = auth.status === 403 ? 'Hanya Admin yang dapat menghapus data. Gunakan Arsip untuk menyingkirkan data.' : auth.error;
    return NextResponse.json({ error: msg }, { status: auth.status });
  }
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: 'ID data tidak valid.' }, { status: 400 });

  const { data, error } = await db().from('registrants').delete().eq('id', params.id).select('id,registration_id,nama_siswa');
  if (error) {
    console.error('DELETE /api/registrants:', error);
    return NextResponse.json({ error: 'Gagal menghapus data.' }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Data tidak ditemukan atau sudah dihapus.' }, { status: 404 });
  console.info(`[AUDIT] ${auth.user.username} menghapus permanen ${data[0].registration_id} (${data[0].nama_siswa})`);
  return NextResponse.json({ ok: true, deleted: data[0].id });
}
