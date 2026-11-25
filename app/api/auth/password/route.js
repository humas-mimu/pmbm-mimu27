import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { createSession, getSessionUser, hashPassword, updateUser, verifyPassword } from '@/lib/auth';
import { limited, peek, fail } from '@/lib/ratelimit';
import { readJson } from '@/lib/http';
import { checkNewPassword } from '@/lib/password';
export const dynamic = 'force-dynamic';

// Ganti password sendiri. Dipakai saat WAJIB ganti (must_change_password) maupun ganti sukarela.
// Berhasil => tanda wajib-ganti dihapus, sesi di perangkat lain dicabut, sesi ini diperbarui (tetap login).
const FAIL = { limit: 5, window: 15 * 60 };   // salah memasukkan password saat ini: 5x / 15 menit per akun

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  if (await limited(req, 'pwchange', 10)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
  }
  const parsed = await readJson(req, 2 * 1024);
  if (parsed.error === 'TOO_LARGE') return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 });
  const current = String(parsed.body?.current_password ?? '');
  const next = String(parsed.body?.new_password ?? '');
  if (!current || current.length > 200) return NextResponse.json({ error: 'Password saat ini wajib diisi.' }, { status: 400 });

  const key = `pw-fail:${user.id}`;
  const lock = await peek(key, FAIL.limit, FAIL.window);
  if (lock.limited) {
    return NextResponse.json(
      { error: `Terlalu banyak salah memasukkan password saat ini. Coba lagi dalam ${Math.ceil(lock.retryAfter / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(lock.retryAfter) } },
    );
  }

  const { data: row } = await db().from('users').select('password_hash').eq('id', user.id).maybeSingle();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    await fail(key, FAIL.limit, FAIL.window);
    return NextResponse.json({ error: 'Password saat ini salah.' }, { status: 400 });
  }
  const problem = checkNewPassword(next, { username: user.username, current });
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const patch = { password_hash: await hashPassword(next), must_change_password: false };
  const nextVer = user.token_version !== undefined ? (user.token_version ?? 0) + 1 : null;
  if (nextVer !== null) patch.token_version = nextVer;   // cabut sesi lama di perangkat lain
  const error = await updateUser(user.id, patch);
  if (error) {
    console.error('POST /api/auth/password:', error);
    return NextResponse.json({ error: 'Gagal menyimpan password baru.' }, { status: 500 });
  }
  await createSession({ id: user.id, role: user.role, token_version: nextVer ?? 0 });
  return NextResponse.json({ ok: true });
}
