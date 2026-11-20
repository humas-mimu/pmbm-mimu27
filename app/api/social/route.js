import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { MAX_SOCIAL, parseSocialUrl, reduceSocial } from '@/lib/social';
export const dynamic = 'force-dynamic';

const err = (m, status) => NextResponse.json({ error: m }, { status });

async function loadList() {
  const s = await getSettings();
  return Array.isArray(s.social_links) ? s.social_links : [];
}
async function saveList(list) {
  const { error } = await db().from('school_settings').upsert({ id: 1, social_links: list, updated_at: new Date().toISOString() });
  if (error) console.error('social save:', error);
  return error;
}
// Link pendek TikTok (vm.tiktok.com / tiktok.com/t/…) -> ikuti pengalihan untuk mendapatkan link lengkap
async function resolveShort(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PMBM/1.0)' }, signal: AbortSignal.timeout(7000) });
    return r.url;
  } catch { return null; }
}

export async function GET() {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return err(auth.error, auth.status);
  return NextResponse.json({ items: await loadList(), max: MAX_SOCIAL });
}

export async function POST(req) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return err(auth.error, auth.status);
  const b = await req.json().catch(() => ({}));

  let parsed = null;
  if (b.action === 'add') {
    parsed = parseSocialUrl(b.url);
    if (parsed?.resolve) {
      const final = await resolveShort(parsed.url);
      parsed = final ? parseSocialUrl(final) : null;
      if (!parsed || parsed.resolve) return err('Link pendek TikTok tidak bisa dibuka. Buka videonya di browser, lalu salin link lengkapnya (…/@akun/video/angka).', 422);
    }
  }
  const res = reduceSocial(await loadList(), b, parsed);
  if (res.error) return err(res.error, res.status);

  const error = await saveList(res.items);
  if (error) {
    const hint = /social_links/.test(error.message || '') ? ' → Jalankan dulu supabase/migrations/002_social_links.sql di Supabase SQL Editor.' : '';
    return err(`Gagal menyimpan: ${error.message}${hint}`, 500);
  }
  return NextResponse.json({ items: res.items });
}
