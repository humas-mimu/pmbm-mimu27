import { NextResponse } from 'next/server';
import { destroySession, getUser, revokeSessions } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// Biasa: hapus cookie di perangkat ini saja (akun yang dipakai bersama tidak ikut terlempar).
// Body { "all": true }: keluar dari SEMUA perangkat — seluruh sesi akun ini dicabut di server.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b?.all === true) {
    const user = await getUser();
    if (user) await revokeSessions(user.id);
  }
  destroySession();
  return NextResponse.json({ ok: true });
}
