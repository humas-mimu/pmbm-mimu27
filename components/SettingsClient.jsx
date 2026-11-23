'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { MAX_WAVES, isoToWibInput, normalizeWaves, wibInputToIso } from '@/lib/registration';
import { Field, Logo } from './ui';
import LoadingOverlay from './LoadingOverlay';

// Logo diperkecil lalu disimpan sebagai data URL (tidak perlu storage terpisah, dan aman untuk tiket PNG)
function fileToLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      if (file.type === 'image/svg+xml') {
        if (reader.result.length > 150_000) return reject(new Error('SVG terlalu besar (maks. ±100 KB)'));
        return resolve(reader.result);
      }
      const img = new Image();
      img.onerror = () => reject(new Error('File gambar tidak valid'));
      img.onload = () => {
        const max = 320;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Favicon: dipersegi 128x128 PNG (atau SVG apa adanya)
function fileToFavicon(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      if (file.type === 'image/svg+xml') {
        if (reader.result.length > 150_000) return reject(new Error('SVG terlalu besar (maks. ±100 KB)'));
        return resolve(reader.result);
      }
      const img = new Image();
      img.onerror = () => reject(new Error('File gambar tidak valid'));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const s = Math.min(128 / img.width, 128 / img.height);
        c.getContext('2d').drawImage(img, (128 - img.width * s) / 2, (128 - img.height * s) / 2, img.width * s, img.height * s);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsClient({ initial }) {
  const [f, setF] = useState({ ...initial, instagram_url: initial.instagram_url || '', tiktok_url: initial.tiktok_url || '', whatsapp_group_link: initial.whatsapp_group_link || '', logo_url: initial.logo_url || null, favicon_url: initial.favicon_url || null });
  const router = useRouter();
  // Jadwal gelombang: di form dipegang sebagai teks WIB (datetime-local), dikonversi ke ISO UTC saat simpan
  const toRows = (list) => normalizeWaves(list).map((w) => ({ name: w.name, open: isoToWibInput(w.open_at), close: isoToWibInput(w.close_at) }));
  const [schedOn, setSchedOn] = useState(!!initial.registration_schedule_enabled);
  const [waves, setWaves] = useState(() => toRows(initial.registration_waves));
  const setWave = (i, k, v) => setWaves((p) => p.map((w, j) => (j === i ? { ...w, [k]: v } : w)));
  const addWave = () => setWaves((p) => [...p, { name: `Gelombang ${p.length + 1}`, open: '', close: '' }]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const msgRef = useRef(null);
  const show = (m) => { setMsg(m); setTimeout(() => msgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { set('logo_url', await fileToLogo(file)); setMsg(null); }
    catch (er) { setMsg({ ok: false, t: er.message }); }
  }
  async function pickFav(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { set('favicon_url', await fileToFavicon(file)); setMsg(null); }
    catch (er) { setMsg({ ok: false, t: er.message }); }
  }
  async function save(e) {
    e.preventDefault(); setMsg(null);
    const payloadWaves = waves.map((w) => ({ name: w.name, open_at: wibInputToIso(w.open), close_at: wibInputToIso(w.close) }));
    setBusy(true);
    try {
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, registration_schedule_enabled: schedOn, registration_waves: payloadWaves }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const d = j.settings || {};
        setSchedOn(!!d.registration_schedule_enabled); setWaves(toRows(d.registration_waves));
        setF((p) => ({ ...p, ...d, instagram_url: d.instagram_url || '', tiktok_url: d.tiktok_url || '', whatsapp_group_link: d.whatsapp_group_link || '', logo_url: d.logo_url || null, favicon_url: d.favicon_url || null }));
        show({ ok: true, t: `Pengaturan berhasil disimpan ke database.${d.whatsapp_group_link ? ` Link grup: ${d.whatsapp_group_link}` : ' (Link grup WhatsApp kosong)'}` });
        router.refresh();
      } else show({ ok: false, t: `Gagal menyimpan (kode ${r.status}): ${j.error || 'terjadi kesalahan.'}` });
    } catch { show({ ok: false, t: 'Tidak dapat terhubung ke server.' }); }
    finally { setBusy(false); }
  }

  return (
    <>
    <LoadingOverlay open={busy} title="Menyimpan pengaturan" messages={['Menyimpan ke database…', 'Memperbarui tampilan…']} />
    <form onSubmit={save} className="pcard grid w-full gap-4 lg:grid-cols-2 [&>*]:self-start">
      <h1 className="font-heading text-2xl font-extrabold lg:col-span-2">Settings Identitas Madrasah</h1>
      <p className="text-sm text-slate-600 lg:col-span-2">Dipakai otomatis di halaman publik, tiket pendaftaran, dan bukti cetak.</p>
      <Field label="Logo Madrasah" hint="PNG / JPG / SVG, otomatis diperkecil. Kosongkan (Hapus) untuk memakai file public/logo/madrasah.svg.">
        <div className="flex items-center gap-4">
          <Logo settings={f} size={72} />
          <label className="pbtn-soft cursor-pointer"><Upload size={16} />Pilih Gambar
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={pick} />
          </label>
          {f.logo_url && <button type="button" className="text-sm font-semibold text-red-600" onClick={() => set('logo_url', null)}>Hapus</button>}
        </div>
      </Field>
      <Field label="Favicon (ikon di tab browser)" hint="PNG / JPG / SVG, otomatis dijadikan persegi. Kosongkan (Hapus) untuk memakai file public/favicon.svg.">
        <div className="flex items-center gap-4">
          <span className="grid h-[72px] w-[72px] place-items-center rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.favicon_url || '/favicon.svg'} alt="Favicon" className="h-10 w-10 object-contain" />
          </span>
          <label className="pbtn-soft cursor-pointer"><Upload size={16} />Pilih Gambar
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={pickFav} />
          </label>
          {f.favicon_url && <button type="button" className="text-sm font-semibold text-red-600" onClick={() => set('favicon_url', null)}>Hapus</button>}
        </div>
      </Field>
      <Field label="Nama Madrasah" required><input className="pinput" value={f.school_name} onChange={(e) => set('school_name', e.target.value)} required /></Field>
      <Field label="Alamat Madrasah" className="lg:col-span-2"><textarea className="pinput" rows={3} value={f.school_address} onChange={(e) => set('school_address', e.target.value)} /></Field>
      <Field label="Nama Program Pendaftaran" required><input className="pinput" value={f.program_name} onChange={(e) => set('program_name', e.target.value)} required /></Field>
      <Field label="Link Grup WhatsApp Calon Murid Baru" hint="Contoh: https://chat.whatsapp.com/XXXXXXXX"><input className="pinput" value={f.whatsapp_group_link} onChange={(e) => set('whatsapp_group_link', e.target.value)} /></Field>
      <Field label="Nomor WhatsApp Panitia" required hint="Diawali 62, tanpa spasi/tanda +. Contoh: 6285163088163"><input className="pinput" value={f.committee_whatsapp} onChange={(e) => set('committee_whatsapp', e.target.value)} required /></Field>
      <Field label="Instagram (footer: Kunjungi dan Follow)" hint="Isi @username atau link profil. Kosongkan untuk menyembunyikan ikon. Contoh: @mimu.buntaran"><input className="pinput" value={f.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} placeholder="https://www.instagram.com/mimu.buntaran" /></Field>
      <Field label="TikTok (footer: Kunjungi dan Follow)" hint="Isi @username atau link profil. Kosongkan untuk menyembunyikan ikon. Contoh: @mimu.buntaran"><input className="pinput" value={f.tiktok_url} onChange={(e) => set('tiktok_url', e.target.value)} placeholder="https://www.tiktok.com/@mimu.buntaran" /></Field>
      <div className="space-y-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 lg:col-span-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><CalendarClock size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-extrabold">Jadwal Pendaftaran per Gelombang</h2>
            <p className="text-xs text-slate-600">Di luar jadwal, formulir online di-blur dan diganti panel hitung mundur menuju gelombang berikutnya. Waktu memakai <b>WIB</b>. Petugas yang login tetap bisa menginput pendaftaran offline.</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <input type="checkbox" className="h-5 w-5 rounded accent-emerald-600" checked={schedOn} onChange={(e) => setSchedOn(e.target.checked)} />
          <span className="text-sm font-bold text-slate-800">Aktifkan jadwal pendaftaran <span className="font-normal text-slate-500">(nonaktif = formulir selalu dibuka)</span></span>
        </label>
        {waves.length === 0 && <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">Belum ada gelombang. Klik “Tambah Gelombang”.</p>}
        <div className="space-y-3">
          {waves.map((w, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-12 sm:items-end">
              <Field label="Nama Gelombang" className="sm:col-span-3"><input className="pinput" value={w.name} maxLength={60} onChange={(e) => setWave(i, 'name', e.target.value)} placeholder="Gelombang 1" /></Field>
              <Field label="Pendaftaran Dibuka" className="sm:col-span-4"><input type="datetime-local" className="pinput" value={w.open} onChange={(e) => setWave(i, 'open', e.target.value)} /></Field>
              <Field label="Pendaftaran Ditutup" className="sm:col-span-4"><input type="datetime-local" className="pinput" value={w.close} onChange={(e) => setWave(i, 'close', e.target.value)} /></Field>
              <button type="button" onClick={() => setWaves((p) => p.filter((_, j) => j !== i))} aria-label={`Hapus ${w.name || 'gelombang'}`} className="grid h-12 place-items-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 sm:col-span-1"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        {waves.length < MAX_WAVES && <button type="button" onClick={addWave} className="pbtn-soft !py-2.5"><Plus size={16} />Tambah Gelombang</button>}
      </div>
      {msg && <p ref={msgRef} className={`break-all rounded-xl px-4 py-3 text-sm font-semibold lg:col-span-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
      <button className="pbtn-primary lg:col-span-2 lg:w-fit" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Simpan Pengaturan</button>
    </form>
    </>
  );
}
