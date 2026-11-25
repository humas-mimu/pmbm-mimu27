import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser, hashPassword, createSession, updateUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const auth = await requireUser(['ADMIN']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json().catch(() => ({}));
  const patch = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 422 });
    if (name.length > 100) return NextResponse.json({ error: 'Nama maksimal 100 karakter.' }, { status: 422 });
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
    if (String(b.password).length > 200) return NextResponse.json({ error: 'Password maksimal 200 karakter.' }, { status: 422 });
    patch.password_hash = await hashPassword(String(b.password));
  }
  if (params.id === auth.user.id && (patch.is_active === false || (patch.role && patch.role !== 'ADMIN'))) {
    return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan / menurunkan akun Anda sendiri.' }, { status: 400 });
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 });

  // Cabut semua sesi lama bila password direset, peran berubah, atau akun dinonaktifkan/diaktifkan
  // (tanpa ini, menonaktifkan lalu mengaktifkan lagi akan "menghidupkan" cookie lama).
  // Bila kolom token_version belum ada (migrasi 006), langkah ini dilewati.
  let nextVer = null;
  if (patch.password_hash !== undefined || patch.role !== undefined || patch.is_active !== undefined) {
    let cur = null;
    for (const cols of ['role,is_active,token_version', 'role,is_active']) {   // kolom token_version baru ada setelah migrasi 006
      const r = await db().from('users').select(cols).eq('id', params.id).maybeSingle();
      if (!r.error) { cur = r.data; break; }
      if (r.error.code !== '42703') break;
    }
    if (cur) {
      const changed = patch.password_hash !== undefined
        || (patch.role !== undefined && patch.role !== cur.role)
        || (patch.is_active !== undefined && patch.is_active !== cur.is_active);
      if (changed && cur.token_version !== undefined) { nextVer = (cur.token_version ?? 0) + 1; patch.token_version = nextVer; }
      // Wajib ganti password setelah reset: Guru = selalu; Admin = hanya bila belum pernah (tanda lama dibiarkan);
      // reset password SENDIRI tidak mewajibkan apa pun.
      if (patch.password_hash !== undefined) {
        if (params.id === auth.user.id) patch.must_change_password = false;
        else if ((patch.role ?? cur.role) === 'GURU') patch.must_change_password = true;
      }
    }
  }
  const error = await updateUser(params.id, patch);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username sudah dipakai akun lain.' }, { status: 409 });
    console.error('PATCH /api/users:', error);
    return NextResponse.json({ error: 'Gagal memperbarui akun.' }, { status: 500 });
  }
  // Admin yang mereset password-nya sendiri tetap login (sesi barunya memakai versi terbaru)
  if (nextVer !== null && params.id === auth.user.id) {
    await createSession({ id: auth.user.id, role: auth.user.role, token_version: nextVer });
  }
  return NextResponse.json({ ok: true });
}
