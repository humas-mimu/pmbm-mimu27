// Membaca foto di public/galery lalu menulis lib/galeri.json (judul dari nama file + ukuran gambar).
// Dijalankan otomatis oleh "npm run dev" dan "npm run build" (juga di Vercel). Manual: npm run galeri
import fs from 'node:fs';
import path from 'node:path';
import * as sizeLib from 'image-size';

const imageSize = sizeLib.imageSize || sizeLib.default;
const dir = path.join(process.cwd(), 'public', 'galery');
const out = path.join(process.cwd(), 'lib', 'galeri.json');
const IMG = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

// "03-Juara_1 Lomba Tahfidz.jpg" -> "Juara 1 Lomba Tahfidz" (angka di depan = urutan tampil, tidak ikut jadi judul)
const toTitle = (file) => file.replace(IMG, '').replace(/^\d+[\s._-]+/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

let files = [];
try { files = fs.readdirSync(dir).filter((f) => !f.startsWith('.') && IMG.test(f)); } catch { /* folder belum ada */ }
files.sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

const items = files.map((f) => {
  let w = 4, h = 3;
  try { const d = imageSize(fs.readFileSync(path.join(dir, f))); if (d.width && d.height) { w = d.width; h = d.height; } }
  catch { console.warn(`[galeri] ukuran tidak terbaca: ${f} (dipakai rasio 4:3)`); }
  return { src: `/galery/${encodeURIComponent(f)}`, title: toTitle(f), w, h };
});

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(items, null, 2) + '\n');
console.log(`[galeri] ${items.length} foto -> lib/galeri.json`);
