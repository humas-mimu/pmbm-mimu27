// Membaca body JSON dengan BATAS UKURAN, dibaca bertahap sehingga permintaan raksasa
// dihentikan di tengah jalan (tidak dimuat penuh ke memori seperti req.json()).
// Mengembalikan { body } atau { error: 'TOO_LARGE' | 'INVALID' }.
export async function readJson(req, maxBytes = 16 * 1024) {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > maxBytes) return { error: 'TOO_LARGE' };
  let text = '';
  try {
    const reader = req.body?.getReader();
    if (reader) {
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) { await reader.cancel().catch(() => {}); return { error: 'TOO_LARGE' }; }
        chunks.push(value);
      }
      text = Buffer.concat(chunks).toString('utf8');
    }
    const body = JSON.parse(text);
    return body && typeof body === 'object' ? { body } : { error: 'INVALID' };
  } catch {
    return { error: 'INVALID' };
  }
}
