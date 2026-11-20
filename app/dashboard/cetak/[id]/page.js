import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileCheck2 } from 'lucide-react';
import ProofSheet from '@/components/ProofSheet';
import PrintButton from '@/components/PrintButton';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';

const clean = (t) => String(t || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const fileTitle = (r) => `Bukti Pendaftaran - ${clean(r.nama_siswa)} - ${r.registration_id}`;

// Judul halaman = nama file default saat disimpan sebagai PDF
export async function generateMetadata({ params }) {
  const { data: r } = await db().from('registrants').select('nama_siswa,registration_id').eq('id', params.id).maybeSingle();
  return { title: { absolute: r ? fileTitle(r) : 'Bukti Pendaftaran' } };   // absolute = tanpa akhiran "— PMBM" agar nama file PDF bersih
}

export default async function CetakPage({ params }) {
  const [settings, user, { data: r }] = await Promise.all([
    getSettings(),
    getUser(),
    db().from('registrants').select('*').eq('id', params.id).maybeSingle(),
  ]);
  if (!r) notFound();
  const ok = r.is_akta_kelahiran || r.is_ktp_ortu || r.is_kk;
  if (!ok) {
    return (
      <div className="pcard mx-auto max-w-md text-center">
        <p className="font-semibold">Centang minimal 1 persyaratan berkas untuk mencetak Bukti Pendaftaran.</p>
        <Link href="/dashboard/rekap" className="pbtn-primary mt-4">Kembali ke Rekap</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto my-2 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl print:m-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <FileCheck2 size={20} className="text-emerald-400" />
          <span className="font-heading text-base font-bold">Pratinjau Bukti Pendaftaran Resmi (Ukuran A4)</span>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton title={fileTitle(r)} />
          <Link href="/dashboard/rekap" className="rounded-xl bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-600 sm:text-sm">Tutup</Link>
        </div>
      </div>
      {!settings.whatsapp_group_link && (
        <div className="no-print border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs font-medium text-amber-900">
          QR Code Grup WhatsApp tidak tampil karena Link Grup WhatsApp belum diisi di menu Settings.
        </div>
      )}
      <ProofSheet registrant={r} settings={settings} petugasName={user?.name} />
    </div>
  );
}
