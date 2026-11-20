import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

// Dipanggil terjadwal agar database gratis Supabase tidak dijeda karena tidak aktif.
export async function GET() {
  const { error } = await db().from('school_settings').select('id').eq('id', 1).maybeSingle();
  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}
