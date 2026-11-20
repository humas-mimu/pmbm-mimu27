import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { cleanRegistrant } from '@/lib/validate';
import { currentYear2, publicRegistrant } from '@/lib/utils';
import { limited } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';

const DUP_COLS = 'nama_siswa,registration_id,program_kelas,created_at';

export async function POST(req) {
  if (limited(req, 'register', 15)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });

  const { data, errors } = cleanRegistrant(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'Data belum lengkap / valid.', errors }, { status: 422 });
  }

  // Jalur ditentukan SERVER dari sesi login — bukan dari kiriman browser.
  const user = await getUser();
  const type = user ? 'OFFLINE' : 'ONLINE';
  // Petugas yang login wajib mengonfirmasi secara sadar bahwa ini input OFFLINE.
  if (user && body.offline_confirmed !== true) {
    return NextResponse.json(
      { error: 'Konfirmasi jalur Offline diperlukan. Muat ulang halaman formulir lalu konfirmasi, atau logout bila ini pendaftar online.' },
      { status: 403 },
    );
  }

  const client = db();
  const { data: dup } = await client.from('registrants').select(DUP_COLS).eq('nik_siswa', data.nik_siswa).maybeSingle();
  if (dup) return NextResponse.json({ error: 'NIK_DUPLICATE', duplicate: dup }, { status: 409 });

  const prefix = type === 'ONLINE' ? 'ONMB' : 'OFMB';
  const yy = currentYear2();
  const { data: seq, error: seqErr } = await client.rpc('next_seq', { p_key: `${prefix}-${yy}` });
  if (seqErr) return NextResponse.json({ error: 'Gagal membuat ID pendaftaran.' }, { status: 500 });

  const row = {
    ...data,
    registration_id: `${prefix}-${yy}${String(seq).padStart(3, '0')}`,
    registration_type: type,
    input_by_user_id: user ? user.id : null,
    is_akta_kelahiran: user ? !!body.is_akta_kelahiran : false,
    is_ktp_ortu: user ? !!body.is_ktp_ortu : false,
    is_kk: user ? !!body.is_kk : false,
  };

  const { data: saved, error } = await client.from('registrants').insert(row).select().single();
  if (error) {
    if (error.code === '23505') {
      const { data: d2 } = await client.from('registrants').select(DUP_COLS).eq('nik_siswa', data.nik_siswa).maybeSingle();
      return NextResponse.json({ error: 'NIK_DUPLICATE', duplicate: d2 }, { status: 409 });
    }
    console.error('POST /api/register:', error);
    const hint = /nik_wali/.test(error.message || '') ? ' Database belum diperbarui: jalankan supabase/migrations/001_nik_wali_favicon.sql di Supabase SQL Editor.' : '';
    return NextResponse.json({ error: `Gagal menyimpan data.${hint}` }, { status: 500 });
  }
  return NextResponse.json({ registrant: publicRegistrant(saved) });
}
