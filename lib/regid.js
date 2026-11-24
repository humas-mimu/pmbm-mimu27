// ID Pendaftaran: <JALUR>-<TAHUN 2 digit><INISIAL 2 huruf>-<KODE ACAK 4>   contoh: ONMB-26AM-K7M4
//  - Inisial hanya penanda agar mudah dikenali panitia. Rahasianya adalah KODE ACAK (±1 juta kemungkinan per inisial).
//  - Kode dibuat server dengan crypto (bukan urutan), alfabet tanpa I, L, O, U agar tidak tertukar saat dibaca/diketik.
//  - ID lama berformat ONMB-26001 tetap diterima (kompatibilitas data lama).
// Hanya untuk dipakai di server.
import { randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 32 karakter
const CODE_LEN = 4;

// 'Agus Mauladi' -> AM | 'Ahmad Agus Mulyono' -> AA | 'Sutrisno' -> SU | 'M. Agus' -> MA
export function initialsOf(name) {
  const words = String(name || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // buang aksen
    .replace(/[^A-Z\s]/g, ' ')                          // tanda baca & angka jadi pemisah
    .split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'XX';
  if (words.length === 1) return (words[0] + 'X').slice(0, 2);   // 1 kata: dua huruf pertama
  return words[0][0] + words[1][0];                              // >=2 kata: huruf pertama dua kata depan
}

export function randomCode(len = CODE_LEN) {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function generateRegistrationId(prefix, yy, name) {
  return `${prefix}-${yy}${initialsOf(name)}-${randomCode()}`;
}

// Merapikan ketikan pengguna menjadi bentuk baku, atau null bila bentuknya tidak dikenali.
// Toleran: huruf kecil, spasi/tanda hubung hilang, O->0, I/L->1 pada bagian kode.
export function normalizeRegistrationId(input) {
  const s = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let m = /^(ONMB|OFMB)(\d{2})([A-Z]{2})([0-9A-Z]{4})$/.exec(s);
  if (m) {
    const code = m[4].replace(/O/g, '0').replace(/[IL]/g, '1');
    return `${m[1]}-${m[2]}${m[3]}-${code}`;
  }
  m = /^(ONMB|OFMB)(\d{5,6})$/.exec(s);   // format lama
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}
