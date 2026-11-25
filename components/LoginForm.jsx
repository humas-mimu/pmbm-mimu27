'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';

export default function LoginForm() {
  const router = useRouter();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Login gagal.'); return; }
      router.push(j.must_change_password ? '/ganti-password' : '/dashboard'); router.refresh();
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-md py-4 sm:py-8">
      <LoadingOverlay open={busy} title="Masuk ke Dashboard" messages={['Memeriksa akun…', 'Menyiapkan dashboard…']} />
      <form onSubmit={submit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><LockKeyhole size={28} /></div>
          <h1 className="font-heading text-2xl font-extrabold">Login Panitia PMBM</h1>
          <p className="text-xs text-slate-500 sm:text-sm">Masuk untuk menginput formulir offline, verifikasi berkas, dan mengelola rekap data.</p>
        </div>
        <div><label className="plabel">Username</label><input className="pinput" autoComplete="username" placeholder="Masukkan username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></div>
        <div>
          <label className="plabel">Password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className="pinput pr-12" autoComplete="current-password" placeholder="Masukkan password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={show}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>}
        <button className="pbtn-primary w-full font-heading text-base" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}Masuk ke Dashboard</button>
      </form>
    </div>
  );
}
