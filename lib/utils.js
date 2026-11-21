export const BULAN = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];

function jakartaParts(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const g = (t) => parts.find((p) => p.type === t).value;
  return { d: g('day'), m: g('month'), y: g('year'), h: g('hour'), mi: g('minute'), s: g('second') };
}

// DD/MM/YYYY HH:mm:ss (WIB)
export function fmtDateTime(iso) {
  if (!iso) return '-';
  const p = jakartaParts(iso);
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.mi}:${p.s}`;
}
export function yearOf(iso) { return iso ? jakartaParts(iso).y : String(new Date().getFullYear()); }
export function currentYear2() { return jakartaParts(new Date().toISOString()).y.slice(-2); }

// 'YYYY-MM-DD' -> '31 DESEMBER 2019'
export function fmtDateLong(ymd) {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-');
  return `${parseInt(d, 10)} ${BULAN[parseInt(m, 10) - 1]} ${y}`;
}
// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
export function fmtDateShort(ymd) {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function waLink(number, text) {
  const n = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text || '')}`;
}

// Template pesan WhatsApp ke panitia (dipakai SEMUA tombol/tautan "hubungi panitia").
// `topik` = isi bagian "terkait ....."; bila kosong, orang tua mengisi sendiri pertanyaannya.
export const WA_TOPIK_KOSONG = '......... (isi pertanyaan anda)';
export function waPanitia(number, topik) {
  const text = `Assalamu'alaikum\n\nPerkenalkan kami orang tua/wali yang akan mendaftarkan putra/putri kami ke madrasah, kami ingin bertanya terkait ${topik || WA_TOPIK_KOSONG}\n\nTerimakasih.`;
  return waLink(number, text);
}

export function alamatLengkap(r) {
  return `${r.jalan_dusun}, RT ${r.rt}/RW ${r.rw}, ${r.desa_kelurahan}, ${r.kecamatan}, ${r.kabupaten_kota} ${r.kode_pos}`;
}
export function waliLabel(r) {
  if (r.wali_siswa === 'ORANG LAIN') return `ORANG LAIN (${r.nama_wali_lain || '-'}${r.nik_wali ? ` / NIK ${r.nik_wali}` : ''})`;
  return r.wali_siswa;
}
export function publicRegistrant(r) {
  const { input_by_user_id, cancel_reason, ...rest } = r;
  return rest;
}

// 'YYYY-MM-DD' hari ini menurut WIB
export function todayYmd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

// 'YYYY-MM-DD' -> '16 November 2026' (hanya huruf awal bulan kapital)
export const BULAN_TITLE = BULAN.map((b) => b.charAt(0) + b.slice(1).toLowerCase());
export function fmtDateLongTitle(ymd) {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-');
  return `${parseInt(d, 10)} ${BULAN_TITLE[parseInt(m, 10) - 1]} ${y}`;
}

// Tahun ajaran baru dimulai ±Juli. Pendaftaran yang dilakukan mulai Agustus (mis. Nov 2026) adalah untuk tahun ajaran BERIKUTNYA (2027/2028);
// pendaftaran Januari–Juli 2027 juga untuk 2027/2028.
export function academicYear(iso) {
  const p = jakartaParts(iso || new Date().toISOString());
  const y = parseInt(p.y, 10);
  const start = parseInt(p.m, 10) >= 8 ? y + 1 : y;
  return { start, end: start + 1, label: `${start}/${start + 1}` };
}

// Tautan sosmed footer: terima @username / username / URL lengkap -> URL https resmi. Kosong = null (disembunyikan).
const SOSMED = {
  instagram: { hosts: ['instagram.com', 'www.instagram.com'], base: 'https://www.instagram.com/', nama: 'Instagram' },
  tiktok: { hosts: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'], base: 'https://www.tiktok.com/@', nama: 'TikTok' },
};
export function normSosmed(platform, input) {
  const cfg = SOSMED[platform];
  const v = String(input ?? '').trim().replace(/\s+/g, '');
  if (!v) return { url: null };
  if (/^[@]?[A-Za-z0-9._]{1,40}$/.test(v)) return { url: `${cfg.base}${v.replace(/^@/, '')}` };
  let u;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { u = null; }
  if (!u || !cfg.hosts.includes(u.hostname.toLowerCase())) return { error: `Link ${cfg.nama} tidak valid. Isi @username atau link profil, contoh: ${cfg.base}mimu.buntaran` };
  u.protocol = 'https:';
  return { url: u.toString() };
}
