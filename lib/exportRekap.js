import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { fmtDateShort, fmtDateTime } from './utils.js';

// Kolom yang harus berformat TEXT di Excel (agar NIK 16 digit tidak jadi 3,5E+15 dan angka 0 di depan tidak hilang)
export const TEXT_COLS = ['NIK Siswa', 'NIK Ayah', 'NIK Ibu', 'NIK Wali', 'No. HP Wali', 'RT', 'RW', 'Kode Pos'];

// Hanya pendaftar AKTIF; data arsip / dibatalkan tidak ikut.
export function rekapRows(rows) {
  return (rows || []).filter((r) => r.status === 'ACTIVE').map((r) => ({
    'ID Pendaftaran': r.registration_id, 'Jalur': r.registration_type, 'Program Kelas': r.program_kelas,
    'Nama Siswa': r.nama_siswa, 'NIK Siswa': r.nik_siswa, 'Tempat Lahir': r.tempat_lahir, 'Tanggal Lahir': fmtDateShort(r.tanggal_lahir),
    'Jenis Kelamin': r.jenis_kelamin, 'Agama': r.agama, 'Asal Sekolah': r.asal_sekolah,
    'RT': r.rt, 'RW': r.rw, 'Jalan/Dusun': r.jalan_dusun, 'Desa/Kelurahan': r.desa_kelurahan, 'Kecamatan': r.kecamatan,
    'Kabupaten/Kota': r.kabupaten_kota, 'Kode Pos': r.kode_pos,
    'Nama Ayah': r.nama_ayah, 'NIK Ayah': r.nik_ayah, 'Nama Ibu': r.nama_ibu, 'NIK Ibu': r.nik_ibu,
    'Wali': r.wali_siswa, 'Nama Wali (Orang Lain)': r.nama_wali_lain || '', 'NIK Wali': r.nik_wali || '', 'No. HP Wali': r.no_hp_wali,
    'FC Akta Kelahiran': r.is_akta_kelahiran ? 'SUDAH' : 'BELUM', 'FC KTP Orang Tua': r.is_ktp_ortu ? 'SUDAH' : 'BELUM', 'FC KK': r.is_kk ? 'SUDAH' : 'BELUM',
    'Waktu Daftar': fmtDateTime(r.created_at),
  }));
}

export function buildWorkbook(rows) {
  const data = rekapRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0] || {});
  const range = XLSX.utils.decode_range(ws['!ref']);
  const textIdx = headers.map((h, i) => (TEXT_COLS.includes(h) ? i : -1)).filter((i) => i >= 0);
  for (let R = range.s.r + 1; R <= range.e.r; R += 1) {
    for (const C of textIdx) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] || (ws[addr] = { t: 's', v: '' });
      cell.t = 's'; cell.v = String(cell.v ?? ''); cell.z = '@';   // '@' = format sel "Text"
    }
  }
  ws['!cols'] = headers.map((h) => ({ wch: Math.min(42, Math.max(h.length, ...data.map((d) => String(d[h] ?? '').length)) + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap PMBM');
  return wb;
}

export const stamp = () => new Date().toISOString().slice(0, 10);

// ---- Pencegahan CSV/Formula Injection ----
// Data diisi publik, lalu CSV dibuka petugas di Excel/Sheets. Sel yang diawali = + - @ (atau tab / CR)
// bisa dibaca sebagai RUMUS (mis. =HYPERLINK(...)). Awalan ' membuatnya tetap teks biasa.
// Satu karakter saja (mis. "-" pada Asal Sekolah) bukan rumus, jadi dibiarkan apa adanya.
// XLSX tidak perlu: sel ditulis sebagai teks (t:'s'), tidak pernah sebagai rumus.
const FORMULA_START = /^[=+\-@\t\r]/;
export function csvSafe(v) {
  if (typeof v !== 'string') return v;
  return v.length > 1 && FORMULA_START.test(v) ? `'${v}` : v;
}
export function csvSafeRow(row) {
  const o = {};
  for (const k of Object.keys(row)) o[k] = csvSafe(row[k]);
  return o;
}

// Isi CSV sebagai teks (BOM + CSV). Dipisahkan dari unduhan agar bisa diuji tanpa browser.
export function buildCsv(rows) {
  // Awalan tab agar Excel tidak mengubah NIK 16 digit / menghapus angka 0 di depan saat CSV dibuka
  const safe = rekapRows(rows).map((d) => {
    const o = csvSafeRow(d);
    TEXT_COLS.forEach((c) => { o[c] = `\t${o[c]}`; });
    return o;
  });
  return `\ufeff${Papa.unparse(safe)}`;
}

export function exportXlsx(rows) {
  XLSX.writeFile(buildWorkbook(rows), `Rekap-PMBM-${stamp()}.xlsx`);
}

export function exportCsv(rows) {
  const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `Rekap-PMBM-${stamp()}.csv`; a.click();
  URL.revokeObjectURL(a.href);
}
