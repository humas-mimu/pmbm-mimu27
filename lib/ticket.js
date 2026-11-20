'use client';
import { toPng } from 'html-to-image';

export const ticketFilename = (r) =>
  `Tiket-${r.registration_id}-${String(r.nama_siswa).replace(/[^A-Za-z0-9]+/g, '_')}.png`;

export async function downloadTicket(node, filename) {
  if (!node) throw new Error('Tiket belum siap');
  try { await document.fonts?.ready; } catch {}
  const opts = { pixelRatio: 2, cacheBust: true, width: 480, height: 720, backgroundColor: '#ffffff' };
  let url;
  try {
    url = await toPng(node, opts);
  } catch {
    url = await toPng(node, { ...opts, skipFonts: true }); // cadangan bila font eksternal gagal disematkan
  }
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
