// Soal hitung pengaman (tanpa akun/kunci pihak ketiga) untuk Cek Pendaftaran. Hanya untuk dipakai di server.
//  - Tanpa penyimpanan: soal dibawa klien sebagai token bertanda tangan (HMAC dengan AUTH_SECRET). Jawaban TIDAK ada di token.
//  - Token berisi nonce acak + waktu kedaluwarsa; kewenangannya (token memang terbitan server) dan jawabannya ditandatangani terpisah,
//    sehingga token palsu bisa ditolak SEBELUM menyentuh database.
//  - Angka ditulis dengan KATA ("tujuh ditambah lima") agar tidak terbaca oleh pola angka sederhana milik bot umum.
//  - Satu soal = satu percobaan: nonce dicatat saat dicoba (lihat app/api/cek) sehingga token & jawaban tidak bisa dipakai ulang.
// Ini penghalang bot sederhana, BUKAN pertahanan terhadap bot yang sengaja dibuat untuk membaca soal ini.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const CAPTCHA_TTL_SEC = 10 * 60;
const WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
  'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas', 'dua puluh'];

function secret() {
  const s = process.env.AUTH_SECRET || '';
  if (s.length < 32) throw new Error('AUTH_SECRET belum diisi / kurang dari 32 karakter');
  return s;
}
const mac = (msg) => createHmac('sha256', secret()).update(`captcha|${msg}`).digest('hex');
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function generateChallenge({ now = Date.now(), rand = randomInt } = {}) {
  const kind = rand(3);
  let a, b, op, answer;
  // Ruang jawaban dibuat lebar (±2..81) agar menebak asal jarang berhasil, tetapi tetap mudah bagi orang dewasa.
  if (kind === 0) { a = 3 + rand(13); b = 3 + rand(13); op = 'ditambah'; answer = a + b; }          // 3..15 + 3..15
  else if (kind === 1) { a = 10 + rand(11); b = 2 + rand(8); op = 'dikurangi'; answer = a - b; }   // 10..20 - 2..9  (hasil 1..18)
  else { a = 3 + rand(7); b = 3 + rand(7); op = 'dikali'; answer = a * b; }                       // 3..9 x 3..9
  const n = randomBytes(8).toString('hex');
  const exp = now + CAPTCHA_TTL_SEC * 1000;
  const payload = Buffer.from(JSON.stringify({ n, exp })).toString('base64url');
  return { question: `Berapa ${WORDS[a]} ${op} ${WORDS[b]}?`, token: `${payload}.${mac(`t|${payload}`)}.${mac(`a|${n}|${exp}|${answer}`)}`, answer };
}

// Token memang terbitan server & belum kedaluwarsa? => { nonce, exp } atau null. Tidak memeriksa jawaban.
export function parseCaptchaToken(token, now = Date.now()) {
  try {
    const [payload, tmac, amac, extra] = String(token ?? '').split('.');
    if (!payload || !tmac || !amac || extra !== undefined || token.length > 400) return null;
    if (!same(tmac, mac(`t|${payload}`))) return null;
    const { n, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!/^[0-9a-f]{16}$/.test(n) || !Number.isFinite(exp) || now >= exp) return null;
    return { nonce: n, exp };
  } catch {
    return null;
  }
}

// Jawaban benar untuk token ini? (panggil setelah parseCaptchaToken berhasil)
export function checkCaptchaAnswer(token, answer) {
  try {
    const t = parseCaptchaToken(token, 0);   // keabsahan & kedaluwarsa sudah diperiksa pemanggil
    const raw = String(answer ?? '').trim();
    if (!t || !/^\d{1,3}$/.test(raw)) return false;
    return same(String(token).split('.')[2], mac(`a|${t.nonce}|${t.exp}|${Number(raw)}`));
  } catch {
    return false;
  }
}
