import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const token = req.cookies.get('pmbm_session')?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET || ''));
      ok = true;
    } catch {}
  }
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete('pmbm_session');   // buang cookie sesi yang sudah kedaluwarsa/tidak valid
    return res;
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
