import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { stamp, csvSafeRow } from './exportRekap.js';

// Hanya data tersimpan milik pendaftar AKTIF (halaman ini memang hanya memuat pendaftar aktif).
export function ukuranRows(rows) {
  return (rows || []).map((r) => ({
    'ID Pendaftaran': r.registration_id,
    'Nama': r.nama_siswa,
    'L/P': r.jenis_kelamin === 'LAKI-LAKI' ? 'L' : 'P',
    'Baju (Atasan)': r.ukuran_baju || '',
    'Celana/Rok (Bawahan)': r.ukuran_bawahan || '',
    'Kaos Olahraga': r.ukuran_olahraga || '',
    'Lain-lain (Keterangan)': r.ukuran_lain || '',
  }));
}

export function exportUkuranXlsx(rows) {
  const data = ukuranRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0] || {});
  // Kolom ukuran berformat Text agar "7+" / "5" tidak diubah Excel
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; R += 1) {
    for (let C = 0; C <= range.e.c; C += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell) { cell.t = 's'; cell.v = String(cell.v ?? ''); cell.z = '@'; }
    }
  }
  ws['!cols'] = headers.map((h) => ({ wch: Math.min(42, Math.max(h.length, ...data.map((d) => String(d[h] ?? '').length)) + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ukuran Seragam');
  XLSX.writeFile(wb, `Ukuran-Seragam-PMBM-${stamp()}.xlsx`);
}

export const buildUkuranCsv = (rows) => `\ufeff${Papa.unparse(ukuranRows(rows).map(csvSafeRow))}`;   // keterangan bebas (ukuran_lain) ikut dibersihkan

export function exportUkuranCsv(rows) {
  const blob = new Blob([buildUkuranCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `Ukuran-Seragam-PMBM-${stamp()}.csv`; a.click();
  URL.revokeObjectURL(a.href);
}
