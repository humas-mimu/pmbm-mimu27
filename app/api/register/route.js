import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { cleanRegistrant } from '@/lib/validate';
import { currentYear2, publicRegistrant } from '@/lib/utils';
import { generateRegistrationId } from '@/lib/regid';
import { readJson } from '@/lib/http';
import { limited } from '@/lib/ratelimit';
import { getSettings } from '@/lib/settings';
import { getRegistrationStatus } from '@/lib/registration';
export const dynamic = 'force-dynamic';

const DUP_COLS = 'nama_siswa,registration_id,program_kelas,created_at';

export async function POST(req) {
  if (await limited(req, 'register', 15)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  // Payload pendaftaran sah hanya ±2 KB; di atas 16 KB pasti bukan dari formulir.
  const parsed = await readJson(req, 16 * 1024);
  if (parsed.error === 'TOO_LARGE') return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 });
  if (!parsed.body) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  const body = parsed.body;
  // Honeypot: kolom tersembunyi yang hanya diisi bot. Pengguna asli diminta memuat ulang (bukan sukses palsu) bila autofill salah mengisinya.
  if (typeof body.kontak_alt === 'string' && body.kontak_alt.trim() !== '') {
    return NextResponse.json({ error: 'Permintaan tidak valid. Muat ulang halaman lalu coba lagi.' }, { status: 400 });
  }

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

  // Jadwal gelombang: pendaftaran ONLINE ditolak server bila di luar waktu (blur di browser saja tidak cukup).
  // Petugas yang login (jalur OFFLINE) tidak dibatasi jadwal.
  if (!user) {
    const st = getRegistrationStatus(await getSettings(), Date.now());
    if (st.state !== 'open') {
      return NextResponse.json({
        error: st.state === 'upcoming'
          ? `Pendaftaran ${st.wave.name} belum dibuka. Silakan muat ulang halaman untuk melihat jadwalnya.`
          : 'Pendaftaran telah berakhir. Silakan hubungi admin.',
        code: 'REGISTRATION_CLOSED',
      }, { status: 403 });
    }
  }

  const client = db();
  // Pengunjung publik TIDAK boleh mendapat data pendaftar lain (ID Pendaftaran kini bersifat rahasia).
  // Petugas yang login tetap melihat detailnya untuk membantu input offline.
  const dupResponse = async () => {
    if (!user) return NextResponse.json({ error: 'NIK_DUPLICATE' }, { status: 409 });
    const { data: d } = await client.from('registrants').select(DUP_COLS).eq('nik_siswa', data.nik_siswa).maybeSingle();
    return NextResponse.json({ error: 'NIK_DUPLICATE', duplicate: d }, { status: 409 });
  };
  const { data: dup } = await client.from('registrants').select('id').eq('nik_siswa', data.nik_siswa).maybeSingle();
  if (dup) return dupResponse();

  const prefix = type === 'ONLINE' ? 'ONMB' : 'OFMB';
  const yy = currentYear2();
  const base = {
    ...data,
    registration_type: type,
    input_by_user_id: user ? user.id : null,
    is_akta_kelahiran: user ? !!body.is_akta_kelahiran : false,
    is_ktp_ortu: user ? !!body.is_ktp_ortu : false,
    is_kk: user ? !!body.is_kk : false,
  };

  // ID acak: bila kebetulan kembar (sangat jarang) buat ulang, bukan dianggap NIK ganda.
  let saved = null;
  let error = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await client.from('registrants')
      .insert({ ...base, registration_id: generateRegistrationId(prefix, yy, data.nama_siswa) })
      .select().single();
    if (!res.error) { saved = res.data; error = null; break; }
    error = res.error;
    if (error.code === '23505' && /registration_id/.test(`${error.message} ${error.details || ''}`)) continue;
    break;
  }
  if (error) {
    // 23505 yang BUKAN karena registration_id = NIK didaftarkan bersamaan oleh pihak lain.
    // (Tabrakan ID berulang 5x jatuh ke bawah sebagai kegagalan biasa, bukan dilaporkan sebagai NIK ganda.)
    if (error.code === '23505' && !/registration_id/.test(`${error.message} ${error.details || ''}`)) return dupResponse();
    console.error('POST /api/register:', error);
    const hint = /nik_wali/.test(error.message || '') ? ' Database belum diperbarui: jalankan supabase/migrations/001_nik_wali_favicon.sql di Supabase SQL Editor.' : '';
    return NextResponse.json({ error: `Gagal menyimpan data.${hint}` }, { status: 500 });
  }
  return NextResponse.json({ registrant: publicRegistrant(saved) });
}
