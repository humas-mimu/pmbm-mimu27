// Ukuran seragam: daftar jenis ukuran bawaan + helper bersama (server & client).
export const DEFAULT_SIZES = ['5', '6', '7', '7+', '8', 'S', 'S+', 'M', 'L', 'XL', 'XXL'];

// Daftar ukuran dari Settings; bila kolom belum ada / kosong / rusak -> pakai bawaan.
export function getSizes(settings) {
  const v = settings?.uniform_sizes;
  return Array.isArray(v) && v.length ? v.map(String) : DEFAULT_SIZES;
}

// Validasi daftar jenis ukuran dari Admin. Mengembalikan { sizes } atau { error }.
export function cleanSizes(input) {
  if (!Array.isArray(input)) return { error: 'Format daftar ukuran tidak valid.' };
  const out = [];
  for (const x of input) {
    const t = String(x ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!t) continue;
    if (t.length > 10) return { error: `Ukuran "${t}" terlalu panjang (maksimal 10 karakter).` };
    if (!out.includes(t)) out.push(t);
  }
  if (out.length === 0) return { error: 'Minimal harus ada 1 jenis ukuran.' };
  if (out.length > 50) return { error: 'Maksimal 50 jenis ukuran.' };
  return { sizes: out };
}

// Sudah diisi = minimal salah satu dari Baju / Celana-Rok / Keterangan terisi.
export const hasUniform = (r) => !!(r && (r.ukuran_baju || r.ukuran_bawahan || r.ukuran_olahraga || r.ukuran_lain));
