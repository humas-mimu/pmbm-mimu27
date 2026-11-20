// Pembatas sederhana (best-effort, in-memory) untuk endpoint publik.
const buckets = new Map();
export function limited(req, name, max = 20, windowMs = 60_000) {
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const k = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n += 1;
  buckets.set(k, b);
  if (buckets.size > 5000) buckets.clear();
  return b.n > max;
}
