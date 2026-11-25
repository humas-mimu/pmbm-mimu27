'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldAlert } from 'lucide-react';

function PwField({ label, value, onChange, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="plabel">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} className="pinput pr-12" autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ChangePasswordForm({ name, forced }) {
  const router = useRouter();
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (f.next.length < 8) return setErr('Password baru minimal 8 karakter.');
    if (f.next !== f.again) return setErr('Konfirmasi password baru tidak sama.');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: f.current, new_password: f.next }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Gagal mengganti password.'); return; }
      router.push('/dashboard'); router.refresh();
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login'); router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-4 sm:py-8">
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><KeyRound size={28} /></div>
          <h1 className="font-heading text-2xl font-extrabold">Ganti Password</h1>
          <p className="text-xs text-slate-500 sm:text-sm">Halo, <b>{name}</b>.</p>
        </div>
        {forced && (
          <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>Demi keamanan, Anda <b>wajib membuat password baru</b> sebelum memakai dashboard. Password sementara tidak boleh dipakai terus.</p>
          </div>
        )}
        <PwField label="Password Saat Ini" value={f.current} onChange={(v) => setF({ ...f, current: v })} autoComplete="current-password" />
        <PwField label="Password Baru" value={f.next} onChange={(v) => setF({ ...f, next: v })} autoComplete="new-password" hint="Minimal 8 karakter, bukan username dan bukan password umum." />
        <PwField label="Ulangi Password Baru" value={f.again} onChange={(v) => setF({ ...f, again: v })} autoComplete="new-password" />
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">{err}</p>}
        <button className="pbtn-primary w-full font-heading text-base" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}Simpan Password Baru</button>
        <div className="flex items-center justify-between text-xs">
          {!forced ? <a href="/dashboard" className="font-bold text-slate-600 underline">Batal</a> : <span />}
          <button type="button" onClick={logout} className="inline-flex items-center gap-1 font-bold text-slate-600 underline"><LogOut size={13} />Keluar</button>
        </div>
      </form>
    </div>
  );
}
