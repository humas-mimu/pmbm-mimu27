// Dipakai di browser DAN server (validasi selalu diulang di server).
export const AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
export const TEXT_FIELDS = [
  'nama_siswa', 'tempat_lahir', 'asal_sekolah', 'jalan_dusun', 'desa_kelurahan',
  'kecamatan', 'kabupaten_kota', 'nama_ayah', 'nama_ibu', 'nama_wali_lain',
];
// Batas panjang (setelah dirapikan & huruf kapital). Dipakai server (menolak) dan formulir (maxLength).
// Nama terpanjang yang wajar ±60–80 karakter; alamat diberi ruang lebih.
export const MAX_LEN = {
  nama_siswa: 100, tempat_lahir: 60, asal_sekolah: 100, jalan_dusun: 150,
  desa_kelurahan: 60, kecamatan: 60, kabupaten_kota: 60,
  nama_ayah: 100, nama_ibu: 100, nama_wali_lain: 100,
};
export const DIGIT_FIELDS = ['nik_siswa', 'rt', 'rw', 'kode_pos', 'nik_ayah', 'nik_ibu', 'nik_wali', 'no_hp_wali'];

export function cleanRegistrant(input) {
  const e = {};
  const d = {};
  // Buang karakter kontrol (NUL dsb. membuat Postgres menolak data) dan karakter tak terlihat / pembalik arah teks.
  const str = (k) => String(input?.[k] ?? '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const k of TEXT_FIELDS) d[k] = str(k).toUpperCase();
  for (const k of DIGIT_FIELDS) d[k] = str(k).replace(/\D/g, '');
  d.program_kelas = str('program_kelas').toUpperCase();
  d.jenis_kelamin = str('jenis_kelamin').toUpperCase();
  d.agama = str('agama').toUpperCase();
  d.wali_siswa = str('wali_siswa').toUpperCase();
  d.tanggal_lahir = str('tanggal_lahir');

  const REQ = 'Wajib diisi';
  ['nama_siswa', 'tempat_lahir', 'asal_sekolah', 'jalan_dusun', 'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'nama_ayah', 'nama_ibu']
    .forEach((k) => { if (!d[k]) e[k] = REQ; });

  for (const [k, max] of Object.entries(MAX_LEN)) {
    if (d[k] && d[k].length > max) e[k] = `Maksimal ${max} karakter`;
  }

  if (!['TAHFIDZ', 'NON-TAHFIDZ'].includes(d.program_kelas)) e.program_kelas = 'Pilih program kelas';
  if (!['LAKI-LAKI', 'PEREMPUAN'].includes(d.jenis_kelamin)) e.jenis_kelamin = 'Pilih jenis kelamin';
  if (!AGAMA.includes(d.agama)) e.agama = 'Pilih agama';
  if (!['AYAH', 'IBU', 'ORANG LAIN'].includes(d.wali_siswa)) e.wali_siswa = 'Pilih wali siswa';

  for (const k of ['nik_siswa', 'nik_ayah', 'nik_ibu']) {
    if (!/^\d{16}$/.test(d[k])) e[k] = 'NIK harus 16 digit angka';
  }
  for (const k of ['rt', 'rw']) if (!/^\d{1,3}$/.test(d[k])) e[k] = 'Isi angka (maks. 3 digit)';
  if (!/^\d{5}$/.test(d.kode_pos)) e.kode_pos = 'Kode pos 5 digit';
  if (!/^(0|62)\d{8,13}$/.test(d.no_hp_wali)) e.no_hp_wali = 'Nomor HP tidak valid (contoh: 08123456789)';

  const dt = d.tanggal_lahir;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || isNaN(new Date(dt).getTime())) e.tanggal_lahir = 'Tanggal lahir tidak valid';
  else if (dt > new Date().toISOString().slice(0, 10)) e.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan';

  if (d.wali_siswa === 'ORANG LAIN') {
    if (!d.nama_wali_lain) e.nama_wali_lain = REQ;
    if (!/^\d{16}$/.test(d.nik_wali)) e.nik_wali = 'NIK harus 16 digit angka';
  } else {
    d.nama_wali_lain = null;
    d.nik_wali = null;
  }
  return { data: d, errors: e };
}
