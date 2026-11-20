import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser, hashPassword } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json().catch(() => ({}));
  const patch = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 422 });
    patch.name = name;
  }
  if (b.username !== undefined) {
    const username = String(b.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return NextResponse.json({ error: 'Username 3–30 karakter (huruf kecil, angka, titik, strip).' }, { status: 422 });
    patch.username = username;
  }
  if (b.role === 'ADMIN' || b.role === 'GURU') patch.role = b.role;
  if (typeof b.is_active === 'boolean') patch.is_active = b.is_active;
  if (b.password !== undefined) {
    if (String(b.password).length < 8) return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 422 });
    patch.password_hash = await hashPassword(String(b.password));
  }
  if (params.id === auth.user.id && (patch.is_active === false || (patch.role && patch.role !== 'ADMIN'))) {
    return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan / menurunkan akun Anda sendiri.' }, { status: 400 });
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 });
  const { error } = await db().from('users').update(patch).eq('id', params.id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username sudah dipakai akun lain.' }, { status: 409 });
    console.error('PATCH /api/users:', error);
    return NextResponse.json({ error: 'Gagal memperbarui akun.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
