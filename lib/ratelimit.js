// Pembatas percobaan untuk endpoint publik.
//  - Hitungan disimpan di database (tabel rate_limits + fungsi rate_hit, migrasi 007) => berlaku lintas instance serverless.
//  - Bila database/fungsi tidak tersedia (mis. migrasi belum dijalankan), otomatis memakai pembatas memori
//    per-instance (perilaku lama) agar situs tetap jalan dan tidak memblokir semua orang.
// Opsional: RATE_LIMIT_MULTIPLIER (mis. 3) melonggarkan batas bila banyak pengguna berbagi satu IP (Wi-Fi madrasah).
import { db } from './supabase';

const MULT = Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);
const UNKNOWN_IP_FACTOR = 10;   // IP tak terbaca => semua orang berbagi satu ember; longgarkan agar tidak saling mengunci

// IP klien. Header yang DIISI PLATFORM didahulukan (Vercel menimpa x-forwarded-for / mengisi x-real-ip sendiri).
// Cadangan: entri PALING KANAN x-forwarded-for (yang ditambahkan proxy tepercaya), bukan paling kiri yang bisa dipalsukan klien.
export function clientIp(req) {
  const h = (n) => (req.headers.get(n) || '').trim();
  const direct = h('x-vercel-forwarded-for') || h('x-real-ip');
  let ip = direct ? direct.split(',')[0].trim() : '';
  if (!ip) {
    const parts = h('x-forwarded-for').split(',').map((s) => s.trim()).filter(Boolean);
    ip = parts[parts.length - 1] || '';
  }
  return ip.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || 'unknown';
}

// ---- cadangan: memori per-instance ----
const mem = new Map();   // key -> { n, t (awal jendela, ms), w (panjang jendela, ms) }
function hitLocal(key, limit, windowSec, inc) {
  const now = Date.now();
  const w = windowSec * 1000;
  let b = mem.get(key);
  if (!b || now - b.t >= w) b = { n: 0, t: now, w };
  if (inc > 0) { b.n += inc; mem.set(key, b); }
  if (mem.size > 5000) {
    // Buang dulu yang jendelanya sudah lewat. Hanya bila masih >5000 kunci yang sama-sama aktif (banjir IP berbeda),
    // buang 1000 yang paling lama — bukan menghapus semuanya seperti versi lama.
    for (const [k, v] of mem) if (now - v.t >= v.w) mem.delete(k);
    if (mem.size > 5000) for (const k of [...mem.keys()].slice(0, 1000)) mem.delete(k);
  }
  return { limited: inc > 0 ? b.n > limit : b.n >= limit, hits: b.n, retryAfter: Math.max(1, Math.ceil((b.t + w - now) / 1000)) };
}

let warned = false;
async function hit(key, limit, windowSec, inc) {
  try {
    const { data, error } = await db().rpc('rate_hit', { p_key: key, p_window: windowSec, p_limit: limit, p_inc: inc });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('respons kosong');
    return { limited: !!row.is_limited, hits: row.cur_hits, retryAfter: row.retry_after };
  } catch (e) {
    if (!warned) { warned = true; console.warn('[ratelimit] database tidak dipakai, beralih ke memori per-instance:', e.message); }
    return hitLocal(key, limit, windowSec, inc);
  }
}

// true bila permintaan ini melebihi `max` per `windowSec` untuk IP tersebut.
export async function limited(req, name, max = 20, windowSec = 60) {
  const ip = clientIp(req);
  const limit = Math.ceil(max * MULT * (ip === 'unknown' ? UNKNOWN_IP_FACTOR : 1));
  return (await hit(`${name}:${ip}`, limit, windowSec, 1)).limited;
}

// Kunci bebas (mis. kegagalan login per akun). peek = hanya cek (belum menambah); fail = catat satu kegagalan.
export const peek = (key, limit, windowSec) => hit(key, limit, windowSec, 0);
export const fail = (key, limit, windowSec) => hit(key, limit, windowSec, 1);
