'use client';
import { useRef, useState } from 'react';
import { Download, FileSearch, Loader2, MessageCircle, Search, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from './ui';
import LoadingOverlay from './LoadingOverlay';
import { ScaledTicket } from './Ticket';
import { downloadTicket, ticketFilename } from '@/lib/ticket';
import { hasUniform } from '@/lib/uniform';
import { alamatLengkap, fmtDateLong, fmtDateTime, waliLabel } from '@/lib/utils';

export default function CekClient({ settings }) {
  const [q, setQ] = useState('');
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [r, setR] = useState(null);
  const [dl, setDl] = useState(false);
  const ref = useRef(null);

  async function submit(e) {
    e.preventDefault(); setErr(''); setR(null); setBusy(true);
    try {
      const res = await fetch('/api/cek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, dob }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Terjadi kesalahan.'); else setR(j.registrant);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusy(false); }
  }
  async function download() {
    setDl(true);
    try { await downloadTicket(ref.current, ticketFilename(r)); } catch { setErr('Gagal membuat gambar tiket.'); }
    finally { setDl(false); }
  }

  const rows = r && [
    ['ID Pendaftaran', r.registration_id], ['Program', r.program_kelas], ['Nama Siswa', r.nama_siswa], ['NIK Siswa', r.nik_siswa],
    ['Tempat, Tgl Lahir', `${r.tempat_lahir}, ${fmtDateLong(r.tanggal_lahir)}`], ['Jenis Kelamin', r.jenis_kelamin], ['Agama', r.agama],
    ['Asal Sekolah', r.asal_sekolah], ['Alamat', alamatLengkap(r)], ['Ayah', r.nama_ayah], ['Ibu', r.nama_ibu],
    ['Wali', waliLabel(r)], ['No. HP', r.no_hp_wali], ['Waktu Daftar', fmtDateTime(r.created_at)],
  ];

  const empty = (Icon, t) => (
    <div className="grid min-h-[260px] place-items-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center">
      <div><Icon className="mx-auto mb-2 text-slate-300" size={40} /><p className="text-sm font-medium text-slate-400">{t}</p></div>
    </div>
  );

  return (
    <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] xl:gap-8">
      <LoadingOverlay open={busy || dl} title={dl ? 'Membuat tiket' : 'Mencari data'} messages={dl ? ['Menyusun tiket pendaftaran…', 'Membuat gambar PNG…'] : ['Mencari data pendaftaran…', 'Memverifikasi tanggal lahir…', 'Menyiapkan tiket…']} />
      {/* KIRI: form pencarian */}
      <form onSubmit={submit} className="pcard space-y-4">
        <h1 className="font-heading text-2xl font-extrabold">Cek Data Pendaftaran</h1>
        <p className="text-sm text-slate-600">Masukkan NIK Siswa atau ID Pendaftaran, beserta tanggal lahir siswa. Anda hanya dapat melihat data milik sendiri.</p>
        <div><label className="plabel">NIK Siswa / ID Pendaftaran</label>
          <input className="pinput uppercase" value={q} onChange={(e) => setQ(e.target.value)} placeholder="16 digit NIK atau ONMB-26001" required /></div>
        <div><label className="plabel">Tanggal Lahir Siswa</label>
          <input type="date" className="pinput" value={dob} onChange={(e) => setDob(e.target.value)} required /></div>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>}
        <button className="pbtn-primary w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}Cari Data</button>
      </form>

      {/* TENGAH: data hasil pencarian */}
      <div className="min-w-0">
        {r ? (
          <div className="pcard space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge color={r.registration_type === 'ONLINE' ? 'blue' : 'violet'}>JALUR {r.registration_type}</Badge>
              <Badge color={r.status === 'ACTIVE' ? 'green' : 'red'}>{r.status === 'ACTIVE' ? 'AKTIF' : 'DIBATALKAN'}</Badge>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 py-2"><dt className="font-semibold text-slate-500">{k}</dt><dd className="col-span-2 break-words font-bold uppercase">{v}</dd></div>
              ))}
            </dl>
            <div>
              <h2 className="mb-2 text-sm font-extrabold">Kelengkapan Berkas</h2>
              <div className="flex flex-wrap gap-2">
                {[['FC Akta Kelahiran', r.is_akta_kelahiran], ['FC KTP Orang Tua', r.is_ktp_ortu], ['FC KK', r.is_kk]].map(([k, ok]) => (
                  <Badge key={k} color={ok ? 'green' : 'amber'}>{ok ? '✔' : '○'} {k}</Badge>
                ))}
              </div>
            </div>
            {hasUniform(r) && (
              <div>
                <h2 className="mb-2 text-sm font-extrabold">Ukuran Seragam</h2>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                  {[['Atasan (Baju)', r.ukuran_baju], ['Bawahan (Celana/Rok)', r.ukuran_bawahan], ['Kaos Olahraga', r.ukuran_olahraga], ['Keterangan', r.ukuran_lain]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-2 px-3 py-2"><dt className="font-semibold text-slate-500">{k}</dt><dd className="col-span-2 break-words font-bold uppercase">{v}</dd></div>
                  ))}
                </dl>
              </div>
            )}
            {settings.whatsapp_group_link && (
              <a href={settings.whatsapp_group_link} target="_blank" rel="noopener noreferrer" className="pbtn-wa w-full"><MessageCircle size={16} />Join Grup WhatsApp</a>
            )}
          </div>
        ) : empty(FileSearch, 'Data pendaftaran akan tampil di sini')}
      </div>

      {/* KANAN: tiket */}
      <div className="min-w-0 space-y-3">
        {r ? (
          <>
            <ScaledTicket registrant={r} settings={settings} innerRef={ref} />
            <button onClick={download} disabled={dl} className="pbtn-primary w-full"><Download size={16} />{dl ? 'Memproses…' : 'Download Tiket (PNG)'}</button>
          </>
        ) : empty(TicketIcon, 'Tiket pendaftaran akan tampil di sini')}
      </div>
    </div>
  );
}
