import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { normSosmed } from '@/lib/utils';
import { validateWavesInput } from '@/lib/registration';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json().catch(() => ({}));
  const s = (v) => String(v ?? '').trim();

  const school_name = s(b.school_name);
  const program_name = s(b.program_name);
  if (!school_name || !program_name) return NextResponse.json({ error: 'Nama madrasah dan nama program wajib diisi.' }, { status: 422 });

  // Link grup: terima dengan/ tanpa "https://", dan juga link Channel WhatsApp
  let wa = s(b.whatsapp_group_link).replace(/\s+/g, '');
  if (wa) {
    if (!/^https?:\/\//i.test(wa)) wa = `https://${wa}`;
    let host = '';
    try { host = new URL(wa).hostname.toLowerCase(); } catch {}
    if (!['chat.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com', 'wa.me'].includes(host)) {
      return NextResponse.json({ error: 'Link grup tidak dikenali. Contoh yang benar: https://chat.whatsapp.com/XXXXXXXX' }, { status: 422 });
    }
    wa = wa.replace(/^http:\/\//i, 'https://');
  }
  // Nomor panitia: boleh 08xxx / 8xxx / +62xxx → disimpan 62xxx
  let phone = s(b.committee_whatsapp).replace(/\D/g, '');
  if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
  else if (phone.startsWith('8')) phone = `62${phone}`;
  if (!/^62\d{8,13}$/.test(phone)) return NextResponse.json({ error: 'Nomor WhatsApp panitia tidak valid. Contoh: 6285163088163 atau 085163088163.' }, { status: 422 });

  // Sosmed footer (opsional; kosong = ikon disembunyikan). Hanya diproses bila dikirim.
  const sosmed = {};
  for (const [k, p] of [['instagram_url', 'instagram'], ['tiktok_url', 'tiktok']]) {
    if (!(k in b)) continue;
    const r = normSosmed(p, b[k]);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    sosmed[k] = r.url;
  }

  // Jadwal gelombang pendaftaran (hanya diproses bila dikirim, agar tidak menimpa data lama)
  const jadwal = {};
  if ('registration_waves' in b) {
    const r = validateWavesInput(b.registration_waves);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    jadwal.registration_waves = r.waves;
    jadwal.registration_schedule_enabled = b.registration_schedule_enabled === true;
    if (jadwal.registration_schedule_enabled && !r.waves.length) {
      return NextResponse.json({ error: 'Jadwal diaktifkan tetapi belum ada gelombang. Tambahkan minimal satu gelombang atau nonaktifkan jadwal.' }, { status: 422 });
    }
  }

  let logo = b.logo_url ?? null;
  if (logo) {
    if (!/^data:image\/(png|jpeg|svg\+xml|webp);base64,/.test(logo)) return NextResponse.json({ error: 'Format logo tidak valid. Gunakan PNG, JPG, WEBP, atau SVG.' }, { status: 422 });
    if (logo.length > 600_000) return NextResponse.json({ error: 'Ukuran logo terlalu besar. Gunakan gambar yang lebih kecil.' }, { status: 422 });
  } else logo = null;

  let fav = b.favicon_url ?? null;
  if (fav) {
    if (!/^data:image\/(png|jpeg|svg\+xml|webp);base64,/.test(fav)) return NextResponse.json({ error: 'Format favicon tidak valid. Gunakan PNG, JPG, WEBP, atau SVG.' }, { status: 422 });
    if (fav.length > 250_000) return NextResponse.json({ error: 'Ukuran favicon terlalu besar.' }, { status: 422 });
  } else fav = null;

  const { data: saved, error } = await db().from('school_settings').upsert({
    id: 1, school_name, program_name, school_address: s(b.school_address),
    whatsapp_group_link: wa || null, committee_whatsapp: phone, logo_url: logo, favicon_url: fav, ...sosmed, ...jadwal,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) {
    console.error('PUT /api/settings:', error);
    const hint = /favicon_url/.test(error.message || '') ? ' → Jalankan dulu supabase/migrations/001_nik_wali_favicon.sql di Supabase SQL Editor.'
      : /registration_waves|registration_schedule_enabled/.test(error.message || '') ? ' → Jalankan dulu supabase/migrations/005_jadwal_gelombang.sql di Supabase SQL Editor.'
      : /instagram_url|tiktok_url/.test(error.message || '') ? ' → Jalankan dulu supabase/migrations/004_footer_sosmed.sql di Supabase SQL Editor.' : '';
    return NextResponse.json({ error: `Gagal menyimpan ke database: ${error.message}${hint}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, settings: saved });
}
