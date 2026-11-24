import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { createSession, verifyPassword } from '@/lib/auth';
import { limited } from '@/lib/ratelimit';
import { readJson } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (limited(req, 'login', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi sebentar.' }, { status: 429 });
  }
  const parsed = await readJson(req, 2 * 1024);
  if (parsed.error === 'TOO_LARGE') return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 });
  const { username, password } = parsed.body || {};
  const generic = NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  if (!username || !password || String(username).length > 60 || String(password).length > 200) return generic;
  const { data: user } = await db()
    .from('users').select('*').eq('username', String(username).trim().toLowerCase()).maybeSingle();
  if (!user || !user.is_active) return generic;
  if (!(await verifyPassword(String(password), user.password_hash))) return generic;
  try {
    await createSession(user);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role: user.role });
}
