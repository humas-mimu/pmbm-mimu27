// Soal bergambar (tanpa akun/kunci pihak ketiga) untuk Cek Pendaftaran. Hanya untuk dipakai di server.
// Dua sistem soal, dipilih acak:
//  1. "warna"  : kode warna ala permainan — legenda lingkaran berwarna berisi angka, satu contoh yang sudah terisi,
//                lalu baris soal berupa lingkaran-lingkaran berwarna yang harus dijumlahkan.
//  2. "isi"    : persamaan dengan satu kotak kosong, mis. 6 − ▢ = 2 (jawabannya 4). Angka berada di kotak berwarna.
// Gambar dibuat server sebagai SVG: angka digambar sebagai GARIS (bukan teks), dan posisi/kemiringan/warna digeser sedikit
// tiap kali, sehingga tidak bisa dibaca dengan sekadar mengurai teks atau mencocokkan kode warna persis.
// Token bertanda tangan (HMAC dengan AUTH_SECRET): jawaban TIDAK ada di token; kewenangan token & jawaban ditandatangani terpisah;
// satu soal = satu percobaan (nonce dicatat oleh app/api/cek).
// Ini penghalang bot sederhana, BUKAN pertahanan terhadap bot yang sengaja dibuat untuk membaca soal ini.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const CAPTCHA_TTL_SEC = 10 * 60;

function secret() {
  const s = process.env.AUTH_SECRET || '';
  if (s.length < 32) throw new Error('AUTH_SECRET belum diisi / kurang dari 32 karakter');
  return s;
}
const mac = (msg) => createHmac('sha256', secret()).update(`captcha|${msg}`).digest('hex');
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ---------------------------------------------------------------- bahan gambar
const INK = '#1f2937';
// Warna dipilih berbeda jelas satu sama lain (terang/gelap & rona), agar mudah dibedakan.
const PALETTE = [[127, 221, 230], [245, 185, 107], [230, 245, 138], [224, 74, 95], [242, 201, 210], [183, 156, 232], [120, 160, 240]];

// Angka 0-9 sebagai garis pada kotak 10 x 16 (stroke, ujung membulat). "9" = "6" diputar 180 derajat.
const GLYPH = {
  0: 'M5 1C1.5 1 1 5 1 8C1 11 1.5 15 5 15C8.5 15 9 11 9 8C9 5 8.5 1 5 1Z',
  1: 'M2.5 4.2L5.5 1.5L5.5 15',
  2: 'M1.5 4.5C1.5 1 8.5 0.5 8.5 4.5C8.5 8 1.5 12 1.5 15L8.8 15',
  3: 'M1.5 2C5 0 9 1.5 8.5 4.5C8 7.5 5 8 4 8C6 8 9 9 8.8 11.5C8.5 15 3 16 1 13.5',
  4: 'M7 15L7 1L1 10.5L9.5 10.5',
  5: 'M8.5 1L2.5 1L1.8 7.5C5 6 9 7.5 8.8 11C8.5 15 3.5 15.5 1 13',
  6: 'M8 1.5C4 1 1.2 5 1.2 10C1.2 14 3 15.3 5 15.3C7.5 15.3 9 13 9 11C9 8.5 7 7 5 7C3 7 1.2 8.5 1.2 10',
  7: 'M1 1L9 1L4 15',
  8: 'M1.8 4.2a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0M1.2 11.4a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0 -7.6 0',
};
GLYPH[9] = GLYPH[6];
const OPS = {
  '+': 'M-12 0H12M0 -12V12',
  '-': 'M-12 0H12',
  '*': 'M-10 -10L10 10M10 -10L-10 10',
  '=': 'M-12 -7H12M-12 7H12',
};

const f1 = (n) => Math.round(n * 10) / 10;
const shuffle = (arr, rand) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr, n, rand) => shuffle(arr, rand).slice(0, n);
const hex = (rgb, rand) => '#' + rgb.map((v) => Math.max(0, Math.min(255, v + rand(11) - 5)).toString(16).padStart(2, '0')).join('');   // geser tipis tiap kali
const span = (a, b, rand) => a + rand(b - a + 1);   // bilangan bulat a..b

function number(str, cx, cy, h, rand) {
  const s = h / 16, n = str.length, total = (n * 10 + (n - 1) * 3) * s;
  let out = '';
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    const tx = f1(cx - total / 2 + i * 13 * s + (rand(30) - 15) / 10);
    const ty = f1(cy - h / 2 + (rand(30) - 15) / 10);
    const sc = f1(s * (0.96 + rand(9) / 100));
    const rot = (ch === '9' ? 180 : 0) + rand(15) - 7;
    out += `<path d="${GLYPH[ch]}" transform="translate(${tx} ${ty}) scale(${sc}) rotate(${rot} 5 8)" fill="none" stroke="${INK}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}
const op = (o, cx, cy, scale = 1) => `<path d="${OPS[o]}" transform="translate(${cx} ${cy}) scale(${scale})" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
const circle = (cx, cy, r, rgb, rand) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${hex(rgb, rand)}"/>`;
const answerBox = (cx, cy, w, h) => `<rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="3"/>`;

// Garis & titik samar sebagai pengganggu ringan (tidak boleh menutupi angka).
function noise(w, h, rand) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const x1 = rand(w), y1 = rand(h), x2 = rand(w), y2 = rand(h), cxp = rand(w), cyp = rand(h);
    out += `<path d="M${x1} ${y1}Q${cxp} ${cyp} ${x2} ${y2}" fill="none" stroke="#9ca3af" stroke-opacity=".22" stroke-width="2"/>`;
  }
  for (let i = 0; i < 14; i++) out += `<circle cx="${rand(w)}" cy="${rand(h)}" r="${1 + rand(3)}" fill="#9ca3af" fill-opacity=".25"/>`;
  return out;
}

// Menata item secara mendatar di tengah lebar W. item = { w, draw(cx) }.
function row(items, W, gap) {
  const total = items.reduce((a, it) => a + it.w, 0) + gap * (items.length - 1);
  let x = (W - total) / 2, out = '';
  for (const it of items) { out += it.draw(f1(x + it.w / 2)); x += it.w + gap; }
  return out;
}

// ---------------------------------------------------------------- sistem 1: kode warna
function specWarna(rand) {
  const numbers = pick([1, 2, 3, 4, 5, 6, 7, 8, 9], 5, rand).sort((a, b) => a - b);
  const colors = pick(PALETTE.map((_, i) => i), 5, rand);                     // colors[i] = warna untuk angka numbers[i]
  const k = rand(2) + 2;                                                      // 2 atau 3 lingkaran per baris
  const idx = [0, 1, 2, 3, 4];
  const ex = pick(idx, k, rand);
  let q;
  do { q = pick(idx, k, rand); } while ([...q].sort().join() === [...ex].sort().join());   // soal beda dengan contoh
  const sum = (ids) => ids.reduce((a, i) => a + numbers[i], 0);
  return { kind: 'warna', numbers, colors, ex, q, exSum: sum(ex), answer: sum(q) };
}
function drawWarna(sp, rand) {
  const W = 560, H = 318;
  let out = '';
  // legenda
  const lx0 = 70, lstep = 105;
  sp.numbers.forEach((n, i) => {
    const cx = lx0 + i * lstep;
    out += circle(cx, 52, 40, PALETTE[sp.colors[i]], rand) + number(String(n), cx, 52, 34, rand);
  });
  const r = sp.ex.length === 2 ? 36 : 29, gap = sp.ex.length === 2 ? 14 : 8;
  const eqRow = (ids, resultStr, y) => {
    const items = [];
    ids.forEach((id, i) => {
      if (i > 0) items.push({ w: 34, draw: (cx) => op('+', cx, y, 0.9) });
      items.push({ w: r * 2, draw: (cx) => circle(cx, y, r, PALETTE[sp.colors[id]], rand) });
    });
    items.push({ w: 34, draw: (cx) => op('=', cx, y, 0.9) });
    items.push({ w: 92, draw: (cx) => answerBox(cx, y, 92, 66) + (resultStr ? number(resultStr, cx, y, 36, rand) : '') });
    return row(items, W, gap);
  };
  out += eqRow(sp.ex, String(sp.exSum), 158);   // contoh (sudah terisi)
  out += eqRow(sp.q, '', 262);                  // soal (kotak kosong)
  return { W, H, body: out };
}

// ---------------------------------------------------------------- sistem 2: isi kotak kosong
function specIsi(rand) {
  const v = rand(5);
  let a, b, c, answer, shape;
  // Rentang dibuat lebar (jawaban 2..38) agar menebak asal jarang berhasil; tetap hitungan 1-2 digit yang mudah.
  if (v === 0) { a = span(2, 20, rand); b = span(2, 20, rand); c = a + b; answer = b; shape = 'a+?=c'; }
  else if (v === 1) { a = span(2, 20, rand); b = span(2, 20, rand); c = a + b; answer = a; shape = '?+b=c'; }
  else if (v === 2) { a = span(8, 40, rand); b = span(2, a - 2, rand); c = a - b; answer = b; shape = 'a-?=c'; }
  else if (v === 3) { b = span(2, 18, rand); c = span(2, 18, rand); a = b + c; answer = a; shape = '?-b=c'; }
  else { a = span(3, 9, rand); b = span(3, 9, rand); c = a * b; answer = b; shape = 'a*?=c'; }
  return { kind: 'isi', shape, a, b, c, answer };
}
function drawIsi(sp, rand) {
  const W = 560, H = 160, y = 80;
  const cols = pick(PALETTE, 3, rand);
  const num = (n, rgb) => ({ w: 88, draw: (cx) => `<rect x="${f1(cx - 44)}" y="${y - 44}" width="88" height="88" rx="16" fill="${hex(rgb, rand)}"/>` + number(String(n), cx, y, 44, rand) });
  const blank = { w: 88, draw: (cx) => `<rect x="${f1(cx - 44)}" y="${y - 44}" width="88" height="88" rx="16" fill="#fff" stroke="#6b7280" stroke-width="4" stroke-dasharray="9 7"/>` };
  const sign = (o) => ({ w: 40, draw: (cx) => op(o, cx, y, 1) });
  const sh = sp.shape;
  const O = sh.includes('*') ? '*' : sh.includes('+') ? '+' : '-';
  const items = [];
  if (sh[0] === '?') items.push(blank, sign(O), num(sp.b, cols[1]));
  else items.push(num(sp.a, cols[0]), sign(O), blank);
  items.push(sign('='), num(sp.c, cols[2]));
  return { W, H, body: row(items, W, 12) };
}

// ---------------------------------------------------------------- perakitan
export function buildSpec(rand = randomInt) { return rand(2) === 0 ? specWarna(rand) : specIsi(rand); }

export function renderSvg(sp, rand = randomInt) {
  const { W, H, body } = sp.kind === 'warna' ? drawWarna(sp, rand) : drawIsi(sp, rand);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="18" fill="#fff"/>${noise(W, H, rand)}${body}</svg>`;
}

const HINT = {
  warna: 'Lihat kode warna di baris atas. Jumlahkan angka dari lingkaran berwarna di baris paling bawah, lalu tulis hasilnya.',
  isi: 'Isi kotak kosong agar hitungannya benar, lalu tulis angkanya.',
};

export function generateChallenge({ now = Date.now(), rand = randomInt } = {}) {
  const sp = buildSpec(rand);
  const svg = renderSvg(sp, rand);
  const n = randomBytes(8).toString('hex');
  const exp = now + CAPTCHA_TTL_SEC * 1000;
  const payload = Buffer.from(JSON.stringify({ n, exp })).toString('base64url');
  return {
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    hint: HINT[sp.kind],
    token: `${payload}.${mac(`t|${payload}`)}.${mac(`a|${n}|${exp}|${sp.answer}`)}`,
    answer: sp.answer,   // hanya untuk pengujian/pemanggil internal; JANGAN dikirim ke klien
    kind: sp.kind,
  };
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
