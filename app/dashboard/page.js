import Link from 'next/link';
import { ClipboardList, Search, Settings, Share2, UserPlus, Users } from 'lucide-react';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fmtDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getUser();
  const { data } = await db().from('registrants')
    .select('id,registration_id,registration_type,program_kelas,status,nama_siswa,created_at,is_akta_kelahiran,is_ktp_ortu,is_kk')
    .order('created_at', { ascending: false }).range(0, 4999);
  const rows = data || [];
  const act = rows.filter((r) => r.status === 'ACTIVE');
  const stats = [
    ['Pendaftar Aktif', act.length, 'text-emerald-700'],
    ['Jalur Online', act.filter((r) => r.registration_type === 'ONLINE').length, 'text-blue-700'],
    ['Jalur Offline', act.filter((r) => r.registration_type === 'OFFLINE').length, 'text-violet-700'],
    ['Tahfidz', act.filter((r) => r.program_kelas === 'TAHFIDZ').length, 'text-emerald-700'],
    ['Non-Tahfidz', act.filter((r) => r.program_kelas === 'NON-TAHFIDZ').length, 'text-slate-700'],
    ['Berkas Belum Dicek', act.filter((r) => !r.is_akta_kelahiran && !r.is_ktp_ortu && !r.is_kk).length, 'text-amber-700'],
  ];
  const actions = [
    ['/daftar', UserPlus, 'Input Pendaftaran Offline', 'Salin formulir tulis tangan wali murid'],
    ['/dashboard/rekap', ClipboardList, 'Rekap Data', 'Cari, verifikasi berkas, edit, cetak, export'],
    ['/cek-pendaftaran', Search, 'Cek Pendaftaran', 'Lihat data pendaftar dengan ID Pendaftaran + NIK'],
    ...(user.role === 'ADMIN' ? [
      ['/dashboard/guru', Users, 'Akun Guru', 'Tambah, reset password, nonaktifkan akun'],
      ['/dashboard/sosmed', Share2, 'Konten Sosmed', 'Instagram, TikTok, YouTube di Beranda'],
      ['/dashboard/settings', Settings, 'Settings', 'Logo, alamat, grup WhatsApp, nomor panitia'],
    ] : []),
  ];
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">Selamat datang, {user.name}</h1>
        <p className="text-sm text-slate-600">Ringkasan pendaftaran PMBM saat ini.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
        {stats.map(([l, v, c]) => (
          <div key={l} className="pcard !p-4 sm:!p-5"><div className="text-xs font-semibold text-slate-500">{l}</div><div className={`font-heading text-3xl font-extrabold ${c}`}>{v}</div></div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map(([href, Icon, t, d]) => (
          <Link key={href} href={href} className="pcard group !p-5 transition hover:border-emerald-400 hover:shadow-md">
            <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"><Icon size={20} /></span>
            <div className="font-heading font-bold">{t}</div>
            <p className="mt-0.5 text-xs text-slate-500">{d}</p>
          </Link>
        ))}
      </div>
      <section className="pcard !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-heading text-lg font-bold">Pendaftar Terbaru</h2>
          <Link href="/dashboard/rekap" className="text-sm font-semibold text-emerald-700 hover:underline">Lihat semua →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr>{['ID', 'Nama Siswa', 'Jalur', 'Program', 'Status', 'Waktu Daftar'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-slate-500">Belum ada pendaftar.</td></tr>}
              {rows.slice(0, 8).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td font-bold">{r.registration_id}</td>
                  <td className="td font-semibold">{r.nama_siswa}</td>
                  <td className="td"><Badge color={r.registration_type === 'ONLINE' ? 'blue' : 'violet'}>{r.registration_type}</Badge></td>
                  <td className="td"><Badge color={r.program_kelas === 'TAHFIDZ' ? 'green' : 'slate'}>{r.program_kelas}</Badge></td>
                  <td className="td"><Badge color={r.status === 'ACTIVE' ? 'green' : 'red'}>{r.status === 'ACTIVE' ? 'AKTIF' : 'DIBATALKAN'}</Badge></td>
                  <td className="td">{fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
