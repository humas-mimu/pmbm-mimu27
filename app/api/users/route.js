import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser, hashPassword } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data } = await db().from('users').select('id,name,username,role,is_active,created_at').order('created_at');
  return NextResponse.json({ users: data || [], me: auth.user.id });
}

export async function POST(req) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = b.role === 'ADMIN' ? 'ADMIN' : 'GURU';
  if (!name) return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 422 });
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return NextResponse.json({ error: 'Username 3–30 karakter (huruf kecil, angka, titik, strip).' }, { status: 422 });
  if (password.length < 8) return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 422 });
  const { error } = await db().from('users').insert({ name, username, role, password_hash: await hashPassword(password) });
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'Username sudah dipakai.' : 'Gagal menambah akun.' }, { status: error.code === '23505' ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
