'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, BookOpenCheck, ClipboardCheck, GraduationCap, Globe, Loader2, LogOut,
  MessageCircle, RotateCcw, School, Send, ShieldAlert, Type, UserCheck, UserCog,
} from 'lucide-react';
import { AGAMA, DIGIT_FIELDS, TEXT_FIELDS, cleanRegistrant } from '@/lib/validate';
import { academicYear, fmtDateTime, waPanitia } from '@/lib/utils';
import { Field, Modal } from './ui';
import AddressFields from './AddressFields';
import Combo from './Combo';
import LoadingOverlay from './LoadingOverlay';
import SuccessPanel from './SuccessPanel';
import { ClosedPanel, ScheduleNotice, useRegistrationGate } from './RegistrationGate';

const EMPTY = {
  program_kelas: '', nama_siswa: '', nik_siswa: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', agama: 'ISLAM',
  asal_sekolah: '', rt: '', rw: '', jalan_dusun: '', desa_kelurahan: '', kecamatan: '', kabupaten_kota: '', kode_pos: '',
  nama_ayah: '', nik_ayah: '', nama_ibu: '', nik_ibu: '', wali_siswa: '', nama_wali_lain: '', nik_wali: '', no_hp_wali: '',
  is_akta_kelahiran: false, is_ktp_ortu: false, is_kk: false,
};
const MAXLEN = { nik_siswa: 16, nik_ayah: 16, nik_ibu: 16, nik_wali: 16, no_hp_wali: 15 };

function Card({ n, title, sub, tone, children }) {
  const dark = tone === 'dark';
  return (
    <section className={dark ? 'space-y-4 rounded-3xl border-2 border-emerald-300 bg-emerald-50/70 p-6 shadow-sm sm:p-7' : 'pcard space-y-4'}>
      <div className={`flex items-center gap-3 border-b pb-3 ${dark ? 'border-emerald-200' : 'border-slate-100'}`}>
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-heading text-sm font-bold text-white ${dark ? 'bg-emerald-700' : 'bg-emerald-600'}`}>{n}</div>
        <div>
          <h2 className={`font-heading text-lg font-bold sm:text-xl ${dark ? 'text-emerald-950' : 'text-slate-900'}`}>{title}</h2>
          {sub && <p className={`text-xs ${dark ? 'text-emerald-800' : 'text-slate-500'}`}>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${active ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'}`}>
      {children}
    </button>
  );
}

export default function RegistrationForm({ staff = null, settings, mode = 'create', initial = null, registrantId = null, serverNow = 0 }) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  // Jadwal gelombang: hanya mengunci formulir ONLINE publik. Petugas (offline) & mode edit tidak terkunci.
  const gate = useRegistrationGate(settings, serverNow);
  const locked = !isEdit && !staff && gate.status.state !== 'open';
  const start = initial ? { ...EMPTY, ...initial, nama_wali_lain: initial.nama_wali_lain || '', nik_wali: initial.nik_wali || '' } : EMPTY;
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(null);
  const [done, setDone] = useState(null);
  const [serverError, setServerError] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [sekolah, setSekolah] = useState([]);
  // Daftar rekomendasi asal sekolah: public/data/sekolah.txt (satu nama per baris, mudah ditambah)
  useEffect(() => {
    fetch('/data/sekolah.txt').then((r) => r.text())
      .then((t) => setSekolah([...new Set(t.split('\n').map((x) => x.trim().toUpperCase()).filter(Boolean))]))
      .catch(() => {});
  }, []);
  // Petugas wajib menegaskan bahwa ia sedang menginput formulir tulis tangan (jalur OFFLINE).
  const [confirmed, setConfirmed] = useState(!staff || isEdit);

  function set(k, v) {
    if (TEXT_FIELDS.includes(k)) v = v.toUpperCase();
    if (DIGIT_FIELDS.includes(k)) v = v.replace(/\D/g, '');
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }
  function setMany(obj) {
    setForm((f) => ({ ...f, ...obj }));
    setErrors((e) => { const n = { ...e }; Object.keys(obj).forEach((k) => delete n[k]); return n; });
  }

  async function checkNik() {
    if (isEdit || form.nik_siswa.length !== 16) return;
    try {
      const r = await fetch(`/api/check-nik?nik=${form.nik_siswa}`);
      const j = await r.json();
      if (j.exists) setDup(j.data || {});   // publik: tanpa detail; petugas login: ada detail
    } catch {}
  }

  async function submit(e) {
    e.preventDefault();
    setServerError('');
    const { errors: errs } = cleanRegistrant(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(isEdit ? `/api/registrants/${registrantId}` : '/api/register', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { action: 'update', ...form } : { ...form, offline_confirmed: !!staff && confirmed }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && j.error === 'NIK_DUPLICATE') { setDup(j.duplicate || {}); return; }
      if (res.status === 422) { setErrors(j.errors || {}); setServerError(j.error || ''); return; }
      if (!res.ok) { setServerError(j.error || 'Terjadi kesalahan. Coba lagi.'); return; }
      if (isEdit) { router.push('/dashboard/rekap'); router.refresh(); return; }
      setDone(j.registrant);
      window.scrollTo({ top: 0 });
    } catch {
      setServerError('Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(start); setErrors({}); setServerError(''); setResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function logoutStaff() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  }

  // ---------- Gerbang konfirmasi jalur OFFLINE ----------
  // Setelah logout (staff jadi null) gerbang tidak boleh tampil lagi -> langsung ke formulir ONLINE
  if (staff && !confirmed) {
    return (
      <div className="w-full py-2 sm:py-6">
        <div className="w-full overflow-hidden rounded-3xl border-2 border-amber-300 bg-white shadow-xl">
          <div className="flex items-center gap-4 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white sm:px-8">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20"><ShieldAlert size={28} /></div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-100">Pengaman Jalur Input Petugas</div>
              <h1 className="font-heading text-xl font-extrabold leading-tight sm:text-2xl">Konfirmasi Input Formulir Offline</h1>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-12">
            <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800 sm:p-6 lg:col-span-7">
              <p className="text-sm leading-relaxed sm:text-base">Anda sedang login sebagai <b>{staff.role}: {staff.name}</b>.</p>
              <p className="text-sm leading-relaxed text-slate-700">
                Formulir yang dibuka saat akun panitia/guru login akan tercatat sebagai jalur{' '}
                <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">OFFLINE (OFMB)</span>{' '}
                dan memunculkan <b>Checklist Kelengkapan Persyaratan Berkas</b>.
              </p>
              <p className="pt-1 text-xs font-medium text-amber-900 sm:text-sm">Pastikan Anda benar-benar menyalin data dari formulir tulis tangan yang diserahkan wali murid.</p>
              <p className="border-t border-amber-200 pt-2 text-xs text-amber-900"><b>Wali murid ingin mendaftar sendiri di perangkat ini?</b> Logout dulu agar tercatat ONLINE.</p>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5">
              <button type="button" onClick={() => setConfirmed(true)} className="pbtn-primary w-full py-4 font-heading text-base sm:text-lg">
                <ClipboardCheck size={20} className="shrink-0" />Saya menginput formulir tulis tangan (Offline)
              </button>
              <Link href="/dashboard/rekap" className="pbtn-soft w-full"><ArrowLeft size={16} />Kembali ke Rekap Data</Link>
              <button type="button" onClick={logoutStaff} className="pbtn-soft w-full"><LogOut size={16} />Logout, lalu daftar sebagai pendaftar online</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return <SuccessPanel registrant={done} settings={settings} staff={staff}
      onNew={() => { setDone(null); setForm(EMPTY); setErrors({}); setResetKey((k) => k + 1); window.scrollTo({ top: 0 }); }} />;
  }

  const year = new Date().getFullYear();
  const yy = String(year).slice(-2);
  const txt = (k, ph, extra = {}) => (
    <input className="pinput" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} maxLength={MAXLEN[k]} autoComplete="off" {...extra} />
  );
  const num = (k, ph, extra = {}) => txt(k, ph, { inputMode: 'numeric', ...extra });
  const modeBadge = isEdit ? initial?.registration_id : staff ? `OFMB-${yy}…` : `ONMB-${yy}…`;

  return (
    <div className="w-full">
    {!isEdit && <ScheduleNotice status={gate.status} now={gate.now} staff={!!staff} />}
    <div className="relative">
    <form onSubmit={submit} className={`w-full transition ${locked ? 'pointer-events-none select-none blur-[6px]' : ''}`} noValidate
      inert={locked ? '' : undefined} aria-hidden={locked || undefined}>
      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:gap-8">
        {/* ================= KOLOM KIRI ================= */}
        <div className="w-full space-y-6">
          <div className="pcard">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <GraduationCap size={14} />Tahun Ajaran {academicYear().label}
                </span>
                <h1 className="font-heading text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
                  {isEdit ? 'Edit Data Pendaftar' : 'Formulir Pendaftaran Murid Baru'}
                </h1>
                <p className="mt-1 text-xs font-semibold text-emerald-700 sm:text-sm">{settings.program_name}</p>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{settings.school_name}</p>
              </div>
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isEdit ? 'ID Pendaftaran' : 'ID Daftar (otomatis)'}</div>
                <div className={`font-heading text-lg font-extrabold sm:text-xl ${staff || isEdit ? 'text-emerald-700' : 'text-blue-600'}`}>{modeBadge}</div>
              </div>
            </div>

            {isEdit ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-900 sm:text-sm"><UserCog size={20} />Mode Edit Data Pendaftar</div>
            ) : staff ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><UserCheck size={20} /></div>
                <div className="text-xs font-semibold leading-snug sm:text-sm">Mode Input Pendaftaran <b>OFFLINE</b> — Petugas: <span className="underline">{staff.name}</span></div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Globe size={20} /></div>
                <div className="text-xs font-semibold leading-snug sm:text-sm">Jalur Pendaftaran Mandiri (<b>ONLINE</b>) — Diisi langsung oleh Calon Wali Murid</div>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              <Type size={20} className="shrink-0 text-amber-600" />
              <span className="text-xs font-bold tracking-wide sm:text-sm">Mohon isi formulir dengan HURUF KAPITAL</span>
            </div>
          </div>

          <Card n="1" title={<>Pilih Program Kelas <span className="text-rose-500">*</span></>} sub="Pilih salah satu program kelas yang diinginkan">
            <div data-error={errors.program_kelas ? 'true' : undefined}>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {[['TAHFIDZ', "Program Hafalan Al-Qur'an", BookOpenCheck, 'emerald'], ['NON-TAHFIDZ', 'Program Reguler', School, 'blue']].map(([v, sub, Icon, c]) => {
                  const on = form.program_kelas === v;
                  return (
                    <button type="button" key={v} onClick={() => set('program_kelas', v)}
                      className={`flex h-full items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition ${on ? (c === 'emerald' ? 'border-emerald-600 bg-emerald-50/60' : 'border-blue-600 bg-blue-50/60') : 'border-slate-200 bg-slate-50/50 hover:border-emerald-300'}`}>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${c === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}><Icon size={20} /></span>
                      <span className="min-w-0 flex-1"><span className="block font-heading text-base font-extrabold text-slate-900">{v}</span><span className="text-xs text-slate-600">{sub}</span></span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? (c === 'emerald' ? 'border-emerald-600' : 'border-blue-600') : 'border-slate-300'}`}>
                        {on && <span className={`h-2.5 w-2.5 rounded-full ${c === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600'}`} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.program_kelas && <p className="mt-2 text-xs font-medium text-red-600">{errors.program_kelas}</p>}
            </div>
          </Card>

          <Card n="2" title="Data Calon Siswa" sub="Isi sesuai Akta Kelahiran / Kartu Keluarga">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap Siswa" required error={errors.nama_siswa} className="sm:col-span-2">{txt('nama_siswa', 'Masukkan nama lengkap siswa')}</Field>
              <Field label="NIK Siswa" required error={errors.nik_siswa} className="sm:col-span-2">{num('nik_siswa', '16 digit NIK', { onBlur: checkNik })}</Field>
              <Field label="Tempat Lahir" required error={errors.tempat_lahir}>{txt('tempat_lahir', 'Contoh: TULUNGAGUNG')}</Field>
              <Field label="Tanggal Lahir" required error={errors.tanggal_lahir}>
                <input type="date" className="pinput" value={form.tanggal_lahir} onChange={(e) => set('tanggal_lahir', e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Jenis Kelamin" required error={errors.jenis_kelamin}>
                <div className="flex gap-2">
                  <Pill active={form.jenis_kelamin === 'LAKI-LAKI'} onClick={() => set('jenis_kelamin', 'LAKI-LAKI')}>LAKI-LAKI</Pill>
                  <Pill active={form.jenis_kelamin === 'PEREMPUAN'} onClick={() => set('jenis_kelamin', 'PEREMPUAN')}>PEREMPUAN</Pill>
                </div>
              </Field>
              <Field label="Agama" required error={errors.agama}>
                <select className="pinput" value={form.agama} onChange={(e) => set('agama', e.target.value)}>
                  <option value="">— PILIH AGAMA —</option>
                  {AGAMA.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Asal Sekolah (Nama Sekolah, Alamat Sekolah)" required error={errors.asal_sekolah} className="sm:col-span-2"
                hint="Ketik sebagian nama lalu pilih dari rekomendasi. Tidak ada di daftar? Ketik nama sekolah dan alamatnya sendiri.">
                <Combo key={resetKey} value={form.asal_sekolah} onChange={(t) => set('asal_sekolah', t)} options={sekolah} placeholder="KETIK NAMA SEKOLAH, CTH: RA SIROTOL MUSTAQIM, BUNTARAN" />
              </Field>
            </div>
          </Card>
        </div>

        {/* ================= KOLOM KANAN ================= */}
        <div className="w-full space-y-6">
          <Card n="3" title="Alamat Lengkap Siswa" sub="Pilih berurutan: Kabupaten/Kota → Kecamatan → Desa, lalu isi jalan, RT, RW, dan kode pos">
            <AddressFields key={resetKey} form={form} set={set} setMany={setMany} errors={errors} />
          </Card>

          <Card n="4" title="Data Orang Tua Kandung" sub="Sesuai Kartu Keluarga">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Ayah" required error={errors.nama_ayah}>{txt('nama_ayah', 'Masukkan nama ayah')}</Field>
              <Field label="NIK Ayah" required error={errors.nik_ayah}>{num('nik_ayah', '16 digit NIK Ayah')}</Field>
              <Field label="Nama Ibu" required error={errors.nama_ibu}>{txt('nama_ibu', 'Masukkan nama ibu')}</Field>
              <Field label="NIK Ibu" required error={errors.nik_ibu}>{num('nik_ibu', '16 digit NIK Ibu')}</Field>
            </div>
          </Card>

          <Card n="5" title="Data Wali & Kontak Aktif" sub="Kontak yang bisa dihubungi panitia">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pilih Wali Siswa" required error={errors.wali_siswa} className="sm:col-span-2">
                <div className="flex gap-2">
                  {[['AYAH', 'Ayah'], ['IBU', 'Ibu'], ['ORANG LAIN', 'Orang Lain']].map(([v, l]) => (
                    <Pill key={v} active={form.wali_siswa === v} onClick={() => set('wali_siswa', v)}>{l}</Pill>
                  ))}
                </div>
              </Field>
              {form.wali_siswa === 'ORANG LAIN' && (
                <>
                  <Field label="Nama Wali" required error={errors.nama_wali_lain} className="sm:col-span-2">{txt('nama_wali_lain', 'Masukkan nama wali')}</Field>
                  <Field label="NIK Wali" required error={errors.nik_wali} className="sm:col-span-2">{num('nik_wali', '16 digit NIK Wali')}</Field>
                </>
              )}
              <Field label="Nomor HP Ayah/Ibu/Wali (WhatsApp aktif)" required error={errors.no_hp_wali} className="sm:col-span-2">
                {num('no_hp_wali', 'Contoh: 08123456789', { type: 'tel' })}
              </Field>
            </div>
          </Card>

          {(staff || isEdit) && (
            <Card n="6" tone="dark" title="Checklist Kelengkapan Persyaratan" sub="Centang berkas fisik yang diserahkan bersama formulir tulis tangan">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[['is_akta_kelahiran', 'FC Akta Kelahiran'], ['is_ktp_ortu', 'FC KTP Orang Tua'], ['is_kk', 'FC KK']].map(([k, l]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-emerald-200 bg-white p-3.5 transition hover:border-emerald-500">
                    <input type="checkbox" className="h-5 w-5 rounded accent-emerald-600" checked={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} />
                    <span className="text-xs font-bold text-slate-800 sm:text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          <div className="pcard space-y-4">
            <p className="text-xs leading-relaxed text-slate-500">
              Pastikan seluruh kolom bertanda <span className="font-bold text-rose-500">*</span> telah diisi lengkap dan benar sesuai dokumen resmi sebelum mengirim pendaftaran.
            </p>
            {serverError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}
            {Object.values(errors).some(Boolean) && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Masih ada isian yang belum lengkap atau belum sesuai. Periksa kolom bertanda merah.</div>
            )}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={resetForm} className="pbtn-soft"><RotateCcw size={16} />Reset Form</button>
              <button type="submit" disabled={busy} className="pbtn-primary flex-1 py-4 font-heading text-base font-extrabold sm:text-lg">
                {busy ? <><Loader2 className="animate-spin" size={20} />Menyimpan…</> : <><Send size={20} />{isEdit ? 'Simpan Perubahan' : staff ? 'Simpan Pendaftaran Offline' : 'Kirim Pendaftaran Sekarang'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <LoadingOverlay open={busy} title={isEdit ? 'Menyimpan perubahan' : 'Mengirim pendaftaran'}
        messages={isEdit ? ['Memeriksa data…', 'Menyimpan ke database…'] : ['Memeriksa kelengkapan data…', 'Mengecek NIK agar tidak ganda…', 'Menyimpan ke database…', 'Membuat nomor & tiket pendaftaran…']} />

      <Modal open={!!dup} onClose={() => setDup(null)} title="NIK Sudah Terdaftar" tone="warn">
        {dup && (
          <>
            <div className="mb-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p>
                {dup.registration_id
                  ? 'NIK Siswa ini sudah terdaftar dalam sistem. Jika terjadi kesalahan, silakan hubungi panitia PPDB/PMBM.'
                  : 'NIK Siswa ini sudah terdaftar. Untuk melihat data dan tiket, buka menu Cek Pendaftaran dengan ID Pendaftaran (tertera di tiket) + NIK. Jika bukan Anda yang mendaftarkan, atau ID hilang, silakan hubungi panitia.'}
              </p>
            </div>
            {dup.registration_id ? (
              <dl className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                {[['Nama Lengkap Siswa', dup.nama_siswa], ['ID Pendaftaran', dup.registration_id], ['Program Kelas', dup.program_kelas], ['Tanggal & Jam Daftar', fmtDateTime(dup.created_at)]].map(([k, v]) => (
                  <div key={k}><dt className="text-[11px] font-bold uppercase text-slate-500">{k}</dt><dd className="font-bold">{v}</dd></div>
                ))}
              </dl>
            ) : (
              <a href="/cek-pendaftaran" className="pbtn-soft w-full">Buka Cek Pendaftaran</a>
            )}
            <a className="pbtn-wa mt-4 w-full" target="_blank" rel="noopener noreferrer"
              href={waPanitia(settings.committee_whatsapp)}>
              <MessageCircle size={16} />Hubungi Panitia via WhatsApp
            </a>
          </>
        )}
      </Modal>
    </form>
    {locked && <ClosedPanel status={gate.status} now={gate.now} settings={settings} />}
    </div>
    </div>
  );
}
