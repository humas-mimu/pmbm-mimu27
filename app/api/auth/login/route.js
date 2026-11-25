import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { createSession, verifyPassword } from '@/lib/auth';
import { clientIp, fail, limited, peek } from '@/lib/ratelimit';
import { readJson } from '@/lib/http';
export const dynamic = 'force-dynamic';

// Penguncian kegagalan login (selain batas 10 percobaan/menit per IP):
//  - per (akun + IP): 5 kegagalan / 15 menit  -> memutus tebak-tebakan dari satu IP
//  - per akun (semua IP): 30 kegagalan / jam  -> memperlambat serangan dari banyak IP
// Kegagalan dicatat SAMA untuk akun yang tidak ada / nonaktif, sehingga penguncian tidak membocorkan keberadaan akun.
const PAIR = { limit: 5, window: 15 * 60 };
const USER = { limit: 30, window: 60 * 60 };

export async function POST(req) {
  if (await limited(req, 'login', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi sebentar.' }, { status: 429 });
  }
  const parsed = await readJson(req, 2 * 1024);
  if (parsed.error === 'TOO_LARGE') return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 });
  const { username, password } = parsed.body || {};
  const generic = NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  if (!username || !password || String(username).length > 60 || String(password).length > 200) return generic;

  const uname = String(username).trim().toLowerCase();
  const kPair = `login-fail:${uname}:${clientIp(req)}`;
  const kUser = `login-fail:${uname}`;

  const [pairState, userState] = await Promise.all([peek(kPair, PAIR.limit, PAIR.window), peek(kUser, USER.limit, USER.window)]);
  if (pairState.limited || userState.limited) {
    const wait = Math.max(pairState.limited ? pairState.retryAfter : 0, userState.limited ? userState.retryAfter : 0);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan login yang gagal. Coba lagi dalam ${Math.ceil(wait / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(wait) } },
    );
  }
  const failed = async () => {
    await Promise.all([fail(kPair, PAIR.limit, PAIR.window), fail(kUser, USER.limit, USER.window)]);
    return generic;
  };

  const { data: user } = await db().from('users').select('*').eq('username', uname).maybeSingle();
  if (!user || !user.is_active) return failed();
  if (!(await verifyPassword(String(password), user.password_hash))) return failed();
  try {
    await createSession(user);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role: user.role, must_change_password: !!user.must_change_password });
}
