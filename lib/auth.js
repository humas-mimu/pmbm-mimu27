import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from './supabase';

export const COOKIE = 'pmbm_session';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

export async function createSession(user) {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET belum diisi / kurang dari 32 karakter');
  }
  const token = await new SignJWT({ role: user.role, tv: user.token_version ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

// Mengembalikan user aktif dari sesi, atau null. Selalu cek ulang ke database
// sehingga akun yang dinonaktifkan / sesinya dicabut (token_version berubah) langsung kehilangan akses.
// Pengunjung tanpa cookie tidak memicu query database sama sekali.
const USER_COLS = 'id,name,username,role,is_active';
export async function getUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const q = (cols) => db().from('users').select(cols).eq('id', payload.sub).maybeSingle();
    let res = await q(`${USER_COLS},token_version`);
    // 42703 = kolom belum ada (migrasi 006 belum dijalankan): tetap jalan, tanpa fitur pencabutan sesi
    if (res.error?.code === '42703') res = await q(USER_COLS);
    const data = res.data;
    if (!data || !data.is_active) return null;
    if (data.token_version !== undefined && (payload.tv ?? 0) !== data.token_version) return null;
    return data;
  } catch {
    return null;
  }
}

// Cabut SEMUA sesi login milik satu akun dengan menaikkan token_version.
// Mengembalikan versi baru, atau null bila gagal / kolom belum ada.
export async function revokeSessions(userId) {
  const { data, error } = await db().from('users').select('token_version').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  const next = (data.token_version ?? 0) + 1;
  const { error: e2 } = await db().from('users').update({ token_version: next }).eq('id', userId);
  return e2 ? null : next;
}

export async function requireUser(roles) {
  const user = await getUser();
  if (!user) return { error: 'Silakan login terlebih dahulu.', status: 401 };
  if (roles && !roles.includes(user.role)) return { error: 'Anda tidak memiliki akses.', status: 403 };
  return { user };
}

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
export const hashPassword = (plain) => bcrypt.hash(plain, 10);
