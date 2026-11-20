import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser(['ADMIN', 'GURU']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await db()
    .from('registrants').select('*').order('created_at', { ascending: false }).range(0, 4999);
  if (error) return NextResponse.json({ error: 'Gagal memuat data.' }, { status: 500 });
  return NextResponse.json({ registrants: data, role: auth.user.role });
}
