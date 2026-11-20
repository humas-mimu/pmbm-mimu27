// Mengenali link Instagram / TikTok / YouTube dan membuat URL embed yang AMAN.
// URL iframe tidak pernah memakai link mentah dari pengguna: hanya host yang diizinkan + ID yang divalidasi.
export const MAX_SOCIAL = 10;
export const PLATFORMS = {
  instagram: { label: 'Instagram', badge: 'bg-pink-100 text-pink-700' },
  tiktok: { label: 'TikTok', badge: 'bg-slate-200 text-slate-800' },
  youtube: { label: 'YouTube', badge: 'bg-red-100 text-red-700' },
};

const IG_ID = /^[A-Za-z0-9_-]{5,40}$/;
const TT_ID = /^\d{8,25}$/;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

// Hasil: { platform, kind, id, url } | { resolve: true, url } (link pendek TikTok) | null
export function parseSocialUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const path = u.pathname;

  if (host === 'instagram.com') {
    const m = path.match(/^\/(?:[A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    const kind = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
    if (!IG_ID.test(m[2])) return null;
    return { platform: 'instagram', kind, id: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/` };
  }

  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    const m = path.match(/\/(?:video|embed\/v2|v)\/(\d+)/i);
    if (m && TT_ID.test(m[1])) {
      const user = path.match(/^\/(@[A-Za-z0-9._]+)\//);
      return { platform: 'tiktok', kind: 'video', id: m[1], url: `https://www.tiktok.com/${user ? user[1] : '@'}/video/${m[1]}` };
    }
    if (host !== 'tiktok.com' || /^\/t\/[A-Za-z0-9]+/.test(path)) return { resolve: true, url: u.origin + u.pathname };
    return null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    let id = null, kind = 'video';
    if (host === 'youtu.be') id = path.split('/')[1];
    else if (path === '/watch') id = u.searchParams.get('v');
    else {
      const m = path.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]+)/);
      if (m) { id = m[2]; if (m[1] === 'shorts') kind = 'short'; }
    }
    if (!id || !YT_ID.test(id)) return null;
    return { platform: 'youtube', kind, id, url: kind === 'short' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` };
  }
  return null;
}

// Alamat iframe — dibuat ulang dari platform + ID yang divalidasi (bukan dari link pengguna)
export function embedSrc(it) {
  if (!it || typeof it.id !== 'string') return null;
  if (it.platform === 'instagram' && IG_ID.test(it.id) && ['p', 'reel', 'tv'].includes(it.kind)) return `https://www.instagram.com/${it.kind}/${it.id}/embed`;
  if (it.platform === 'tiktok' && TT_ID.test(it.id)) return `https://www.tiktok.com/embed/v2/${it.id}`;
  if (it.platform === 'youtube' && YT_ID.test(it.id)) return `https://www.youtube-nocookie.com/embed/${it.id}?rel=0&playsinline=1`;
  return null;
}

// ===== Deskripsi & mode tampilan =====
export const DESC_MAX = 500;
export const itemKey = (x) => `${x.platform}:${x.id}`;
export const cleanDesc = (d) => String(d ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, DESC_MAX);
// Instagram sering meminta login sehingga embed-nya kosong -> default tampil sebagai kartu tautan (embed hanya bila dipilih admin).
// TikTok & YouTube default embed.
export const wantsEmbed = (it) => (it.platform === 'instagram' ? it.embed === true : it.embed !== false);

// Perubahan daftar (murni, tanpa database). `parsed` = hasil parseSocialUrl yang sudah final (untuk aksi 'add').
export function reduceSocial(list, b, parsed) {
  const L = Array.isArray(list) ? list : [];
  const fail = (error, status) => ({ error, status });
  if (b.action === 'add') {
    if (!parsed || parsed.resolve) return fail('Link tidak dikenali. Gunakan link postingan/reels Instagram (…/p/… atau …/reel/…), video TikTok (…/video/…), atau YouTube / Shorts.', 422);
    if (L.length >= MAX_SOCIAL) return fail(`Maksimal ${MAX_SOCIAL} konten. Hapus salah satu dulu.`, 422);
    if (L.some((x) => itemKey(x) === itemKey(parsed))) return fail('Konten ini sudah ada di daftar.', 409);
    return { items: [...L, { platform: parsed.platform, kind: parsed.kind, id: parsed.id, url: parsed.url, desc: cleanDesc(b.desc), embed: parsed.platform !== 'instagram' }] };
  }
  if (b.action === 'update') {
    if (!L.some((x) => itemKey(x) === b.key)) return fail('Konten tidak ditemukan.', 404);
    return { items: L.map((x) => (itemKey(x) !== b.key ? x : { ...x, desc: cleanDesc(b.desc), ...(typeof b.embed === 'boolean' ? { embed: b.embed } : {}) })) };
  }
  if (b.action === 'remove') return { items: L.filter((x) => itemKey(x) !== b.key) };
  if (b.action === 'move') {
    const i = L.findIndex((x) => itemKey(x) === b.key);
    const j = b.dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= L.length) return { items: L };
    const next = [...L];
    [next[i], next[j]] = [next[j], next[i]];
    return { items: next };
  }
  return fail('Aksi tidak dikenal.', 400);
}
