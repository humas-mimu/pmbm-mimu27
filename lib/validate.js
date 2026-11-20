// Dipakai di browser DAN server (validasi selalu diulang di server).
export const AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
export const TEXT_FIELDS = [
  'nama_siswa', 'tempat_lahir', 'asal_sekolah', 'jalan_dusun', 'desa_kelurahan',
  'kecamatan', 'kabupaten_kota', 'nama_ayah', 'nama_ibu', 'nama_wali_lain',
];
export const DIGIT_FIELDS = ['nik_siswa', 'rt', 'rw', 'kode_pos', 'nik_ayah', 'nik_ibu', 'nik_wali', 'no_hp_wali'];

export function cleanRegistrant(input) {
  const e = {};
  const d = {};
  const str = (k) => String(input?.[k] ?? '').trim().replace(/\s+/g, ' ');

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
