import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { createSession, verifyPassword } from '@/lib/auth';
import { limited } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (limited(req, 'login', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi sebentar.' }, { status: 429 });
  }
  const { username, password } = await req.json().catch(() => ({}));
  const generic = NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  if (!username || !password) return generic;
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
