'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Info, KeyRound, Loader2, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { Badge, Field, Modal } from './ui';

// Password acak yang mudah dibaca (tanpa karakter yang mirip: 0/O, 1/l/I)
function genPassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join('');
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input type={show ? 'text' : 'password'} className="pinput pr-11 font-mono" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} autoComplete="new-password" required />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button type="button" className="pbtn-soft !px-3 !py-2 text-xs" onClick={() => { onChange(genPassword()); setShow(true); }}>
        <RefreshCw size={14} />Buat acak
      </button>
    </div>
  );
}

export default function GuruClient() {
  const [users, setUsers] = useState(null);
  const [me, setMe] = useState('');
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'GURU' });
  const [reset, setReset] = useState(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [editU, setEditU] = useState(null);     // { id, name, username, role, isMe }
  const [reveal, setReveal] = useState(null);   // { name, username, password } — ditampilkan SEKALI
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/users'); const j = await r.json();
    if (r.ok) { setUsers(j.users); setMe(j.me); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(url, method, body) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Gagal.'); return false; }
    setErr(''); await load(); return true;
  }
  async function create(e) {
    e.preventDefault();
    const snap = { ...form };
    if (await call('/api/users', 'POST', snap)) {
      setAdd(false); setForm({ name: '', username: '', password: '', role: 'GURU' });
      setReveal({ name: snap.name, username: snap.username.trim().toLowerCase(), password: snap.password });
    }
  }
  async function doReset(e) {
    e.preventDefault();
    const target = reset; const newPw = pw;
    if (await call(`/api/users/${target.id}`, 'PATCH', { password: newPw })) {
      setReset(null); setPw('');
      setReveal({ name: target.name, username: target.username, password: newPw });
    }
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (await call(`/api/users/${editU.id}`, 'PATCH', { name: editU.name, username: editU.username, role: editU.role })) setEditU(null);
  }
  async function copyCred() {
    const text = `Username: ${reveal.username}\nPassword: ${reveal.password}`;
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (!users) return <p className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="animate-spin" size={18} />Memuat…</p>;
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold">Manajemen Akun Guru / Panitia</h1>
        <button className="pbtn-primary" onClick={() => { setAdd(true); setErr(''); setForm({ name: '', username: '', password: genPassword(), role: 'GURU' }); }}><Plus size={16} />Tambah Akun</button>
      </div>
      <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>Password disimpan <b>terenkripsi satu arah</b>, sehingga password yang sedang berlaku <b>tidak dapat dilihat kembali</b> oleh siapa pun, termasuk Admin. Ini mengamankan akun bila database bocor. Jika guru lupa, tekan <b>Reset Password</b>: password baru langsung ditampilkan dan bisa disalin untuk diberikan ke guru.</p>
      </div>
      {err && !add && !reset && !editU && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{err}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr>{['Nama', 'Username', 'Role', 'Status', 'Aksi'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td !text-sm font-semibold">{u.name}{u.id === me && <span className="text-slate-400"> (Anda)</span>}</td>
                <td className="td !text-sm">{u.username}</td>
                <td className="td"><Badge color={u.role === 'ADMIN' ? 'violet' : 'blue'}>{u.role}</Badge></td>
                <td className="td"><Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'AKTIF' : 'NONAKTIF'}</Badge></td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => { setEditU({ id: u.id, name: u.name, username: u.username, role: u.role, isMe: u.id === me }); setErr(''); }}><Pencil size={13} />Edit</button>
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => { setReset(u); setPw(genPassword()); setErr(''); }}><KeyRound size={13} />Reset Password</button>
                    {u.id !== me && (
                      <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => call(`/api/users/${u.id}`, 'PATCH', { is_active: !u.is_active })}>
                        <Power size={13} />{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="Tambah Akun">
        <form onSubmit={create} className="space-y-3">
          <Field label="Nama" required><input className="pinput" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Username" required hint="Huruf kecil/angka, 3–30 karakter"><input className="pinput" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></Field>
          <Field label="Password" required hint="Minimal 8 karakter. Bisa dibuat acak, lalu disalin setelah akun dibuat."><PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} /></Field>
          <Field label="Role">
            <select className="pinput" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="GURU">GURU</option><option value="ADMIN">ADMIN</option></select>
          </Field>
          {err && <p className="text-sm font-medium text-red-600">{err}</p>}
          <button className="pbtn-primary w-full">Simpan</button>
        </form>
      </Modal>

      <Modal open={!!editU} onClose={() => setEditU(null)} title="Edit Akun">
        {editU && (
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Nama" required><input className="pinput" value={editU.name} onChange={(e) => setEditU({ ...editU, name: e.target.value })} required autoFocus /></Field>
            <Field label="Username" required hint="Huruf kecil/angka, 3–30 karakter. Bila diganti, gunakan username baru ini untuk login."><input className="pinput" value={editU.username} onChange={(e) => setEditU({ ...editU, username: e.target.value })} required /></Field>
            <Field label="Role" hint={editU.isMe ? 'Role akun Anda sendiri tidak dapat diturunkan.' : 'Berlaku pada permintaan berikutnya dari akun tersebut.'}>
              <select className="pinput" value={editU.role} disabled={editU.isMe} onChange={(e) => setEditU({ ...editU, role: e.target.value })}><option value="GURU">GURU</option><option value="ADMIN">ADMIN</option></select>
            </Field>
            {err && <p className="text-sm font-medium text-red-600">{err}</p>}
            <button className="pbtn-primary w-full">Simpan Perubahan</button>
          </form>
        )}
      </Modal>

      <Modal open={!!reset} onClose={() => setReset(null)} title={`Reset Password: ${reset?.name || ''}`}>
        <form onSubmit={doReset} className="space-y-3">
          <Field label="Password Baru" required hint="Minimal 8 karakter. Password lama akan tidak berlaku.">
            <PasswordInput value={pw} onChange={setPw} />
          </Field>
          {err && <p className="text-sm font-medium text-red-600">{err}</p>}
          <button className="pbtn-primary w-full">Simpan Password</button>
        </form>
      </Modal>

      <Modal open={!!reveal} onClose={() => { setReveal(null); setCopied(false); }} title="Catat Kredensial Akun">
        {reveal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Berikan data ini kepada <b>{reveal.name}</b>. Password <b>hanya ditampilkan sekarang</b> dan tidak bisa dilihat lagi setelah jendela ini ditutup.</p>
            <dl className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div><dt className="text-[11px] font-bold uppercase text-emerald-800">Username</dt><dd className="font-mono text-lg font-bold">{reveal.username}</dd></div>
              <div><dt className="text-[11px] font-bold uppercase text-emerald-800">Password</dt><dd className="break-all font-mono text-lg font-bold">{reveal.password}</dd></div>
            </dl>
            <button onClick={copyCred} className="pbtn-primary w-full">{copied ? <><Check size={16} />Tersalin</> : <><Copy size={16} />Salin Username &amp; Password</>}</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
