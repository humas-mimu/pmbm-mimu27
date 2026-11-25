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

// Muat user aktif dari sesi (selalu cek ulang ke database), atau null.
// Akun yang dinonaktifkan / sesinya dicabut (token_version berubah) langsung kehilangan akses.
// Pengunjung tanpa cookie tidak memicu query database sama sekali.
// Kolom opsional (token_version = migrasi 006, must_change_password = migrasi 008): bila belum ada, tetap jalan tanpa fiturnya.
const COLSETS = [
  'id,name,username,role,is_active,token_version,must_change_password',
  'id,name,username,role,is_active,token_version',
  'id,name,username,role,is_active',
];
async function loadUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    let res;
    for (const cols of COLSETS) {
      res = await db().from('users').select(cols).eq('id', payload.sub).maybeSingle();
      if (res.error?.code !== '42703') break;   // 42703 = kolom belum ada
    }
    const data = res.data;
    if (!data || !data.is_active) return null;
    if (data.token_version !== undefined && (payload.tv ?? 0) !== data.token_version) return null;
    return data;
  } catch {
    return null;
  }
}

// DEFAULT AMAN: akun yang masih WAJIB ganti password dianggap BELUM login. Semua halaman dashboard, API staf,
// dan mode "petugas" di formulir pendaftaran memakai fungsi ini, jadi otomatis terkunci sampai password diganti.
export async function getUser() {
  const u = await loadUser();
  return u && !u.must_change_password ? u : null;
}

// Khusus alur ganti password / login / layout: ikut mengembalikan akun yang masih wajib ganti password (u.must_change_password).
export const getSessionUser = loadUser;

// Cabut SEMUA sesi login milik satu akun dengan menaikkan token_version.
// Mengembalikan versi baru, atau null bila gagal / kolom belum ada.
export async function revokeSessions(userId) {
  const { data, error } = await db().from('users').select('token_version').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  const next = (data.token_version ?? 0) + 1;
  const { error: e2 } = await db().from('users').update({ token_version: next }).eq('id', userId);
  return e2 ? null : next;
}

// Tulis ke tabel users; bila migrasi opsional belum dijalankan (kolom belum ada), kolom itu dilewati dan sisanya tetap disimpan.
const OPTIONAL_COLS = ['token_version', 'must_change_password'];
async function writeUser(run, values) {
  const v = { ...values };
  for (;;) {
    const { error } = await run(v);
    if (!error) return null;
    const col = OPTIONAL_COLS.find((c) => c in v && `${error.message} ${error.details || ''}`.includes(c));
    if (!col) return error;
    console.warn(`[users] kolom ${col} belum ada — jalankan migrasi terbaru di supabase/migrations`);
    delete v[col];
  }
}
export const updateUser = (id, patch) => writeUser((v) => db().from('users').update(v).eq('id', id), patch);
export const insertUser = (row) => writeUser((v) => db().from('users').insert(v), row);

export async function requireUser(roles) {
  const user = await getSessionUser();
  if (!user) return { error: 'Silakan login terlebih dahulu.', status: 401 };
  if (user.must_change_password) return { error: 'Anda wajib mengganti password terlebih dahulu sebelum melanjutkan.', status: 403 };
  if (roles && !roles.includes(user.role)) return { error: 'Anda tidak memiliki akses.', status: 403 };
  return { user };
}

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
export const hashPassword = (plain) => bcrypt.hash(plain, 10);
