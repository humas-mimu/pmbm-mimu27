import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getSizes } from '@/lib/uniform';
export const dynamic = 'force-dynamic';

const MIGRATION_HINT = ' Database belum diperbarui: jalankan supabase/migrations/003_ukuran_seragam.sql di Supabase SQL Editor.';
const isMissing = (e) => /ukuran_|uniform_|save_uniform_sizes|42703|42883|PGRST202/.test(`${e?.code || ''} ${e?.message || ''}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Daftar pendaftar AKTIF + ukuran seragam + daftar jenis ukuran. Admin & Guru.
export async function GET() {
  const auth = await requireUser(['ADMIN', 'GURU']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [settings, { data, error }] = await Promise.all([
    getSettings(),
    db().from('registrants')
      .select('id,registration_id,nik_siswa,nama_siswa,jenis_kelamin,ukuran_baju,ukuran_bawahan,ukuran_olahraga,ukuran_lain')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .range(0, 4999),
  ]);
  if (error) {
    console.error('GET /api/uniform:', error);
    return NextResponse.json({ error: `Gagal memuat data.${isMissing(error) ? MIGRATION_HINT : ''}` }, { status: 500 });
  }
  return NextResponse.json({ rows: data, sizes: getSizes(settings), role: auth.user.role });
}

// Simpan SEKALIAN banyak baris: { items: [{ id, ukuran_baju, ukuran_bawahan, ukuran_lain }] } — satu transaksi, semua atau tidak sama sekali.
export async function PUT(req) {
  const auth = await requireUser(['ADMIN', 'GURU']);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b.items) || b.items.length === 0) return NextResponse.json({ error: 'Tidak ada perubahan untuk disimpan.' }, { status: 400 });
  if (b.items.length > 5000) return NextResponse.json({ error: 'Terlalu banyak data dalam satu kali simpan.' }, { status: 400 });

  const t = (v) => String(v ?? '').trim();
  const sizes = getSizes(await getSettings());
  const seen = new Set();
  const items = [];
  for (const x of b.items) {
    const id = t(x?.id);
    if (!UUID.test(id)) return NextResponse.json({ error: 'ID data tidak valid.' }, { status: 400 });
    if (seen.has(id)) continue;
    seen.add(id);
    const it = { id, ukuran_baju: t(x.ukuran_baju), ukuran_bawahan: t(x.ukuran_bawahan), ukuran_olahraga: t(x.ukuran_olahraga), ukuran_lain: t(x.ukuran_lain) };
    if (it.ukuran_lain.length > 100) return NextResponse.json({ error: 'Keterangan maksimal 100 karakter.' }, { status: 422 });
    items.push(it);
  }

  // Ukuran harus termasuk daftar jenis ukuran. Pengecualian: nilai lama yang tidak diubah (mis. ukuran yang sudah dihapus Admin dari daftar).
  const SIZE_FIELDS = ['ukuran_baju', 'ukuran_bawahan', 'ukuran_olahraga'];
  const notListed = (i, f) => i[f] && !sizes.includes(i[f]);
  const odd = items.filter((i) => SIZE_FIELDS.some((f) => notListed(i, f)));
  if (odd.length) {
    const current = new Map();
    for (let n = 0; n < odd.length; n += 100) {
      const ids = odd.slice(n, n + 100).map((i) => i.id);
      const { data, error } = await db().from('registrants').select('id,ukuran_baju,ukuran_bawahan,ukuran_olahraga').in('id', ids);
      if (error) {
        console.error('PUT /api/uniform (cek nilai lama):', error);
        return NextResponse.json({ error: `Gagal memvalidasi data.${isMissing(error) ? MIGRATION_HINT : ''}` }, { status: 500 });
      }
      (data || []).forEach((r) => current.set(r.id, r));
    }
    for (const i of odd) {
      const c = current.get(i.id) || {};
      const bad = SIZE_FIELDS.some((f) => notListed(i, f) && i[f] !== c[f]);
      if (bad) return NextResponse.json({ error: 'Ada ukuran yang tidak terdaftar di Jenis Ukuran. Muat ulang halaman lalu coba lagi.' }, { status: 422 });
    }
  }

  const { data: n, error } = await db().rpc('save_uniform_sizes', { p_items: items });
  if (error) {
    console.error('PUT /api/uniform:', error);
    return NextResponse.json({ error: `Gagal menyimpan data.${isMissing(error) ? MIGRATION_HINT : ''}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, saved: n ?? items.length, items });
}
