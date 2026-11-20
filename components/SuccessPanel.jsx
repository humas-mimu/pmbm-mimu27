'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, MessageCircle, Printer, Plus, Search } from 'lucide-react';
import { ScaledTicket } from './Ticket';
import LoadingOverlay from './LoadingOverlay';
import { downloadTicket, ticketFilename } from '@/lib/ticket';

export default function SuccessPanel({ registrant: r, settings, staff, onNew }) {
  const ref = useRef(null);
  const auto = useRef(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true); setMsg('');
    try { await downloadTicket(ref.current, ticketFilename(r)); }
    catch { setMsg('Gagal membuat gambar tiket. Silakan coba tekan tombol Download Tiket lagi.'); }
    finally { setBusy(false); }
  }

  // Pendaftar mandiri (ONLINE): tiket otomatis ter-download
  useEffect(() => {
    if (r.registration_type === 'ONLINE' && !auto.current) {
      auto.current = true;
      setTimeout(download, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrint = r.is_akta_kelahiran || r.is_ktp_ortu || r.is_kk;

  return (
    <div className="grid w-full items-start gap-6 lg:grid-cols-2 xl:gap-8">
      <LoadingOverlay open={busy} title="Membuat tiket" messages={['Menyusun tiket pendaftaran…', 'Membuat gambar PNG…', 'Menyiapkan unduhan…']} />
      <div className="pcard text-center">
        <CheckCircle2 className="mx-auto text-brand" size={48} />
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Selamat! Pendaftaran Berhasil</h1>
        <p className="mt-1 text-sm text-slate-600">
          {staff
            ? 'Data pendaftar offline sudah tersimpan.'
            : 'Tiket pendaftaran otomatis diunduh. Jika tidak, tekan tombol Download Tiket. Simpan tiket ini, lalu datang ke madrasah untuk konfirmasi dan membawa berkas persyaratan.'}
        </p>
        {msg && <p className="mt-2 text-sm font-medium text-red-600">{msg}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={download} disabled={busy} className="pbtn-primary"><Download size={16} />{busy ? 'Memproses…' : 'Download Tiket (PNG)'}</button>
          {settings.whatsapp_group_link && (
            <a href={settings.whatsapp_group_link} target="_blank" rel="noopener noreferrer" className="pbtn-wa">
              <MessageCircle size={16} />Join Grup WhatsApp
            </a>
          )}
        </div>
        {staff ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {canPrint && <Link href={`/dashboard/cetak/${r.id}`} className="pbtn-soft"><Printer size={16} />Cetak Bukti</Link>}
            <button onClick={onNew} className="pbtn-primary"><Plus size={16} />Input Pendaftar Berikutnya</button>
            <Link href="/dashboard/rekap" className="pbtn-soft">Ke Rekap Data</Link>
          </div>
        ) : (
          <div className="mt-2"><Link href="/cek-pendaftaran" className="pbtn-soft"><Search size={16} />Cek Pendaftaran</Link></div>
        )}
      </div>
      <ScaledTicket registrant={r} settings={settings} innerRef={ref} />
    </div>
  );
}
