'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, FileSearch, Loader2, MessageCircle, RefreshCw, Search, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from './ui';
import LoadingOverlay from './LoadingOverlay';
import { ScaledTicket } from './Ticket';
import { downloadTicket, ticketFilename } from '@/lib/ticket';
import { hasUniform } from '@/lib/uniform';
import { fmtDateLong, fmtDateTime, waPanitia, waliLabel } from '@/lib/utils';

export default function CekClient({ settings }) {
  const [nik, setNik] = useState('');
  const [cap, setCap] = useState(null);   // { image, hint, token } — soal pengaman bergambar
  const [ans, setAns] = useState('');
  const [capErr, setCapErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [r, setR] = useState(null);
  const [dl, setDl] = useState(false);
  const ref = useRef(null);

  async function loadCaptcha() {
    setCap(null); setAns('');
    try {
      const res = await fetch('/api/captcha', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error();
      setCap(j); setCapErr('');
    } catch { setCapErr('Soal pengaman gagal dimuat. Tekan tombol muat ulang di sebelahnya.'); }
  }
  useEffect(() => { loadCaptcha(); }, []);

  async function submit(e) {
    e.preventDefault(); setErr(''); setR(null);
    if (!cap) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nik, captcha_token: cap.token, captcha_answer: ans }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Terjadi kesalahan.'); else setR(j.registrant);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusy(false); loadCaptcha(); }   // tiap soal hanya sekali pakai: selalu minta soal baru
  }
  async function download() {
    setDl(true);
    try { await downloadTicket(ref.current, ticketFilename(r)); } catch { setErr('Gagal membuat gambar tiket.'); }
    finally { setDl(false); }
  }

  const rows = r && [
    ['ID Pendaftaran', r.registration_id], ['Program', r.program_kelas], ['Nama Siswa', r.nama_siswa], ['NIK Siswa', r.nik_siswa],
    ['Tempat, Tgl Lahir', `${r.tempat_lahir}, ${fmtDateLong(r.tanggal_lahir)}`], ['Jenis Kelamin', r.jenis_kelamin], ['Agama', r.agama],
    ['Asal Sekolah', r.asal_sekolah], ['Ayah', r.nama_ayah], ['Ibu', r.nama_ibu],
    ['Wali', waliLabel(r)], ['No. HP', r.no_hp_wali], ['Waktu Daftar', fmtDateTime(r.created_at)],
  ];

  const empty = (Icon, t) => (
    <div className="grid min-h-[260px] place-items-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center">
      <div><Icon className="mx-auto mb-2 text-slate-300" size={40} /><p className="text-sm font-medium text-slate-400">{t}</p></div>
    </div>
  );

  return (
    <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] xl:gap-8">
      <LoadingOverlay open={busy || dl} title={dl ? 'Membuat tiket' : 'Mencari data'} messages={dl ? ['Menyusun tiket pendaftaran…', 'Membuat gambar PNG…'] : ['Mencari data pendaftaran…', 'Memverifikasi NIK…', 'Menyiapkan tiket…']} />
      {/* KIRI: form pencarian */}
      <form onSubmit={submit} className="pcard space-y-4">
        <h1 className="font-heading text-2xl font-extrabold">Cek Data Pendaftaran</h1>
        <p className="text-sm text-slate-600">Masukkan NIK Siswa yang didaftarkan, lalu jawab soal bergambar. Hanya data pendaftaran yang tampil di halaman ini yang dapat dilihat.</p>
        <div><label className="plabel">NIK Siswa</label>
          <input className="pinput" inputMode="numeric" value={nik} onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="16 digit NIK" autoComplete="off" required /></div>
        <div>
          <label className="plabel" htmlFor="cek-soal">Soal Pengaman</label>
          <div className="relative">
            {cap
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cap.image} alt="Soal pengaman bergambar. Ikuti petunjuk di bawah gambar." className="aspect-[560/318] w-full select-none rounded-xl border border-slate-200 bg-white" draggable={false} />
              : <div className="grid aspect-[560/318] w-full place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400">Memuat soal…</div>}
            <button type="button" onClick={loadCaptcha} aria-label="Ganti soal" title="Ganti soal" className="pbtn-soft absolute right-2 top-2 !px-2.5 !py-2 shadow"><RefreshCw size={15} /></button>
          </div>
          <p className="mt-2 text-xs text-slate-600" aria-live="polite">{cap ? cap.hint : ''}</p>
          <input id="cek-soal" className="pinput mt-2" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Tulis jawaban (angka)" autoComplete="off" required />
          {capErr && <p className="mt-1 text-xs font-medium text-rose-700">{capErr}</p>}
          <p className="mt-2 text-center text-xs text-slate-500">
            Soal sulit dilihat? Tekan tombol ganti soal, atau{' '}
            <a href={waPanitia(settings.committee_whatsapp, 'Kesulitan membuka Cek Pendaftaran')} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">hubungi panitia</a>.
          </p>
        </div>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>}
        <button className="pbtn-primary w-full" disabled={busy || !cap}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}Cari Data</button>
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
