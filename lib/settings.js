import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from './supabase';

export const SETTINGS_TAG = 'settings';   // dibersihkan lewat revalidateTag(SETTINGS_TAG) setiap Admin menyimpan perubahan
const SAFETY_TTL = 300;                   // detik; jaring pengaman bila revalidateTag terlewat

export const DEFAULT_SETTINGS = {
  school_name: "MI Terpadu Manba'ul 'Ulum Buntaran",
  school_address: '',
  program_name: 'PMBM (Penerimaan Murid Baru Madrasah)',
  logo_url: null,
  favicon_url: null,
  social_links: [],
  uniform_sizes: ['5', '6', '7', '7+', '8', 'S', 'S+', 'M', 'L', 'XL', 'XXL'],
  instagram_url: 'https://www.instagram.com/mimu.buntaran',
  tiktok_url: 'https://www.tiktok.com/@mimu.buntaran',
  whatsapp_group_link: '',
  committee_whatsapp: '6285163088163',
  registration_schedule_enabled: false,
  registration_waves: [],
};

async function readRow() {
  const { data, error } = await db().from('school_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;   // dilempar agar kegagalan TIDAK ikut tersimpan di cache
  return data || {};
}

// Versi PUBLIK: gambar (data-URL base64, bisa ratusan KB) tidak ikut; diganti alamat pendek yang
// disajikan route /api/logo dan /api/favicon (di-cache browser/CDN). Parameter v = penanda versi.
function toPublic(row) {
  const v = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const { logo_url, favicon_url, ...rest } = row;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    logo_url: logo_url ? `/api/logo?v=${v}` : null,
    favicon_url: favicon_url ? `/api/favicon?v=${v}` : null,
  };
}

const cachedPublic = unstable_cache(async () => toPublic(await readRow()), ['settings-public'], { tags: [SETTINGS_TAG], revalidate: SAFETY_TTL });

// Dipakai semua halaman & layout: dibaca dari cache, bukan dari database di setiap kunjungan.
export const getSettings = cache(async function getSettings() {
  try {
    return await cachedPublic();
  } catch (e) {
    console.error('getSettings:', e.message);
    return DEFAULT_SETTINGS;
  }
});

// Baris LENGKAP langsung dari database (termasuk gambar data-URL), tanpa cache.
// Hanya untuk halaman Settings Admin dan proses baca-lalu-tulis (mis. Konten Sosmed).
export async function getSettingsFresh() {
  try {
    return { ...DEFAULT_SETTINGS, ...(await readRow()) };
  } catch (e) {
    console.error('getSettingsFresh:', e.message);
    return DEFAULT_SETTINGS;
  }
}

const IMAGE_COLS = ['logo_url', 'favicon_url'];
const cachedImage = unstable_cache(async (col) => {
  const { data, error } = await db().from('school_settings').select(col).eq('id', 1).maybeSingle();
  if (error) throw error;
  return data?.[col] || null;
}, ['settings-image'], { tags: [SETTINGS_TAG], revalidate: 3600 });

// Data-URL logo / favicon mentah (untuk route gambar & gambar OG). Hanya kolom yang diizinkan.
export async function getSettingImage(col) {
  if (!IMAGE_COLS.includes(col)) return null;
  try { return await cachedImage(col); } catch (e) { console.error('getSettingImage:', e.message); return null; }
}
