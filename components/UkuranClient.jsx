'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, FileSpreadsheet, FileText, Loader2, Plus, Ruler, Save, Search, X } from 'lucide-react';
import { Modal } from './ui';
import HScroll from './HScroll';
import { exportUkuranCsv, exportUkuranXlsx } from '@/lib/exportUkuran';
import { hasUniform } from '@/lib/uniform';

const FIELDS = ['ukuran_baju', 'ukuran_bawahan', 'ukuran_olahraga', 'ukuran_lain'];
const sel = 'input !w-auto !py-2';
const cellSel = 'input !w-auto !min-w-[92px] !py-1.5 !pl-2.5 !pr-7';
const val = (v) => (v == null ? '' : String(v));
const sameAsSaved = (r, e) => FIELDS.every((f) => val(r[f]).trim() === val(e[f]).trim());

// Satu baris tabel. Di-memo agar mengetik di satu baris tidak merender ulang ratusan baris lain.
const Row = memo(function Row({ r, e, sizes, onChange, disabled }) {
  const cur = (f) => (e ? e[f] : val(r[f]));
  const opts = (f) => {
    const v = cur(f);
    return v && !sizes.includes(v) ? [...sizes, v] : sizes;   // nilai lama yang sudah dihapus dari daftar tetap tampil (jangan hilang diam-diam)
  };
  const dirty = !!e;
  return (
    <tr className={dirty ? 'bg-amber-50' : 'hover:bg-slate-50'}>
      <td className="td !py-2 font-bold">{r.registration_id}</td>
      <td className="td !py-2 font-semibold">{r.nama_siswa}</td>
      <td className="td !py-2 text-center">{r.jenis_kelamin === 'LAKI-LAKI' ? 'L' : 'P'}</td>
      {['ukuran_baju', 'ukuran_bawahan', 'ukuran_olahraga'].map((f) => (
        <td key={f} data-edit-area className="td !py-2 text-center">
          <select className={cellSel} value={cur(f)} disabled={disabled} onChange={(ev) => onChange(r.id, f, ev.target.value)} aria-label={`${{ ukuran_baju: 'Baju', ukuran_bawahan: 'Celana/Rok', ukuran_olahraga: 'Kaos Olahraga' }[f]} ${r.nama_siswa}`}>
            <option value="">—</option>
            {opts(f).map((s) => <option key={s} value={s}>{s}{sizes.includes(s) ? '' : ' (tidak aktif)'}</option>)}
          </select>
        </td>
      ))}
      <td data-edit-area className="td !py-2">
        <input className="input !min-w-[200px] !py-1.5" maxLength={100} value={cur('ukuran_lain')} disabled={disabled} placeholder="Lain-lain (opsional)"
          onChange={(ev) => onChange(r.id, 'ukuran_lain', ev.target.value)} aria-label={`Lain-lain ${r.nama_siswa}`} />
      </td>
    </tr>
  );
});

export default function UkuranClient({ role }) {
  const [rows, setRows] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);                 // { ok, text }
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');          // ALL | EMPTY | FILLED (berdasarkan data TERSIMPAN)
  const [edits, setEdits] = useState({});               // { [id]: { ukuran_baju, ukuran_bawahan, ukuran_lain } } — hanya baris yang berbeda dari data tersimpan
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState(false);            // panel konfirmasi "simpan atau tidak"
  const [sizeModal, setSizeModal] = useState(false);

  const editsRef = useRef({});
  const byId = useRef(new Map());
  const pendingRef = useRef(null);                      // elemen yang diklik user di luar area input (diulang setelah simpan / buang)
  const bypassRef = useRef(false);
  const panelRef = useRef(false);
  const savingRef = useRef(false);
  editsRef.current = edits;
  panelRef.current = panel;
  savingRef.current = saving;

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/uniform');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Gagal memuat data.'); return; }
      byId.current = new Map(j.rows.map((x) => [x.id, x]));
      setRows(j.rows); setSizes(j.sizes);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Ubah satu kolom. Bila hasilnya sama dengan data tersimpan, baris tidak dianggap berubah.
  const onChange = useCallback((id, field, value) => {
    setEdits((prev) => {
      const orig = byId.current.get(id);
      if (!orig) return prev;
      const base = prev[id] || { ukuran_baju: val(orig.ukuran_baju), ukuran_bawahan: val(orig.ukuran_bawahan), ukuran_olahraga: val(orig.ukuran_olahraga), ukuran_lain: val(orig.ukuran_lain) };
      const next = { ...base, [field]: value };
      const out = { ...prev };
      if (sameAsSaved(orig, next)) delete out[id]; else out[id] = next;
      return out;
    });
    setMsg(null);
  }, []);

  const dirtyCount = Object.keys(edits).length;

  // SIMPAN SEMUA baris yang diedit dalam satu permintaan (satu transaksi di server).
  const save = useCallback(async () => {
    const items = Object.entries(editsRef.current).map(([id, v]) => ({ id, ...v }));
    if (!items.length) return true;
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/uniform', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, text: j.error || 'Gagal menyimpan.' }); return false; }
      const done = new Map(items.map((i) => [i.id, i]));
      setRows((p) => {
        const next = p.map((x) => {
          const i = done.get(x.id);
          if (!i) return x;
          const y = { ...x, ukuran_baju: i.ukuran_baju.trim() || null, ukuran_bawahan: i.ukuran_bawahan.trim() || null, ukuran_olahraga: i.ukuran_olahraga.trim() || null, ukuran_lain: i.ukuran_lain.trim() || null };
          byId.current.set(y.id, y);
          return y;
        });
        return next;
      });
      setEdits({});
      setMsg({ ok: true, text: `Berhasil menyimpan ukuran seragam ${items.length} siswa.` });
      return true;
    } catch {
      setMsg({ ok: false, text: 'Tidak dapat terhubung ke server. Perubahan Anda belum tersimpan.' });
      return false;
    } finally { setSaving(false); }
  }, []);

  useEffect(() => {
    if (!msg?.ok) return undefined;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // Klik DI LUAR area kolom input saat ada perubahan -> tampilkan panel "simpan atau tidak".
  // Dipasang di fase capture agar klik pada link/tombol (menu, logout, export, dll.) bisa ditahan dulu.
  useEffect(() => {
    const onClick = (e) => {
      if (bypassRef.current || panelRef.current || savingRef.current) return;
      if (!Object.keys(editsRef.current).length) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-edit-area],[data-keep-edits]')) return;
      e.preventDefault(); e.stopPropagation();
      pendingRef.current = t.closest('a[href],button,[role="menuitem"],[role="button"]');
      setPanel(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Tutup tab / refresh saat masih ada perubahan -> peringatan bawaan browser
  useEffect(() => {
    if (!dirtyCount) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirtyCount > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ulangi klik yang tadi ditahan (mis. pindah menu / export) setelah user memilih Simpan atau Buang.
  function replayPending() {
    const el = pendingRef.current;
    pendingRef.current = null;
    if (!el) return;
    setTimeout(() => {
      if (!el.isConnected) return;
      bypassRef.current = true;
      try { el.click(); } finally { bypassRef.current = false; }
    }, 80);
  }
  async function panelSave() {
    const ok = await save();
    setPanel(false);
    if (ok) replayPending(); else pendingRef.current = null;
  }
  function panelDiscard() { setEdits({}); setPanel(false); setMsg(null); replayPending(); }
  function panelContinue() { setPanel(false); pendingRef.current = null; }

  const stats = useMemo(() => {
    const all = rows || [];
    const filled = all.filter(hasUniform).length;
    return { total: all.length, filled, empty: all.length - filled };
  }, [rows]);

  const shown = useMemo(() => {
    const k = q.trim().toUpperCase();
    return (rows || []).filter((r) =>
      (filter === 'ALL' || (filter === 'FILLED') === hasUniform(r)) &&
      (!k || r.nama_siswa.includes(k) || r.nik_siswa.includes(k) || r.registration_id.includes(k)));
  }, [rows, q, filter]);

  // Jumlah siswa per ukuran untuk tiap jenis seragam (dari data TERSIMPAN). Ukuran lama yang sudah dihapus dari daftar tetap dihitung.
  const counts = useMemo(() => {
    const all = rows || [];
    const cols = [...sizes];
    const rowsOut = [['Atasan (Baju)', 'ukuran_baju'], ['Bawahan (Celana/Rok)', 'ukuran_bawahan'], ['Kaos Olahraga', 'ukuran_olahraga']].map(([label, f]) => {
      const by = {};
      let total = 0;
      all.forEach((r) => { const v = r[f]; if (v) { by[v] = (by[v] || 0) + 1; total += 1; if (!cols.includes(v)) cols.push(v); } });
      return { label, by, total };
    });
    return { cols, rows: rowsOut };
  }, [rows, sizes]);

  const usage = useMemo(() => {
    const m = {};
    (rows || []).forEach((r) => { [r.ukuran_baju, r.ukuran_bawahan, r.ukuran_olahraga].forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; }); });
    return m;
  }, [rows]);

  function exportData(kind) {
    if (!(rows || []).length) { alert('Belum ada pendaftar aktif untuk diekspor.'); return; }
    if (kind === 'xlsx') exportUkuranXlsx(rows); else exportUkuranCsv(rows);   // data tersimpan, hanya pendaftar aktif
  }

  if (err) return <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{err}</p>;
  if (!rows) return <p className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="animate-spin" size={18} />Memuat data…</p>;

  const dirtyNames = Object.keys(edits).map((id) => byId.current.get(id)?.nama_siswa).filter(Boolean);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">Ukuran Seragam</h1>
        <p className="text-sm text-slate-600">Pilih ukuran langsung di tabel, lalu tekan <b>Simpan</b> sekali untuk menyimpan semua baris yang diubah. Data otomatis tampil di Bukti Pendaftaran dan Cek Pendaftaran.</p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="grid grid-cols-3 gap-3 xl:w-[34rem] xl:shrink-0">
          {[['Pendaftar Aktif', stats.total, 'text-emerald-700'], ['Sudah Diisi', stats.filled, 'text-blue-700'], ['Belum Diisi', stats.empty, 'text-amber-700']].map(([l, v, c]) => (
            <div key={l} className="card !p-4"><div className="text-xs font-semibold text-slate-500">{l}</div><div className={`font-heading text-3xl font-extrabold ${c}`}>{v}</div></div>
          ))}
        </div>

        <div className="card min-w-0 flex-1 !p-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Jumlah per Ukuran</h2>
            <span className="text-[11px] text-slate-400">data tersimpan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-center text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase text-slate-500">
                  <th className="px-2 py-1 text-left"></th>
                  {counts.cols.map((c) => <th key={c} className="px-2 py-1">{c}{sizes.includes(c) ? '' : '*'}</th>)}
                  <th className="px-2 py-1 text-emerald-700">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counts.rows.map((r) => (
                  <tr key={r.label}>
                    <td className="whitespace-nowrap px-2 py-1 text-left text-xs font-semibold text-slate-600">{r.label}</td>
                    {counts.cols.map((c) => <td key={c} className={`px-2 py-1 tabular-nums ${r.by[c] ? 'font-extrabold text-slate-900' : 'text-slate-300'}`}>{r.by[c] || 0}</td>)}
                    <td className="px-2 py-1 font-extrabold tabular-nums text-emerald-700">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {counts.cols.some((c) => !sizes.includes(c)) && <p className="mt-1 px-1 text-[10px] text-slate-400">* ukuran tidak aktif (sudah dihapus dari Jenis Ukuran, data siswa tetap tersimpan)</p>}
        </div>
      </div>

      <div className="card space-y-3 !p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input data-keep-edits className="input !pl-9 up" placeholder="Cari nama siswa / NIK / ID pendaftaran" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select data-keep-edits className={sel} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">Semua Data</option><option value="EMPTY">Belum Diisi</option><option value="FILLED">Sudah Diisi</option>
          </select>
          {role === 'ADMIN' && (
            <button data-keep-edits onClick={() => setSizeModal(true)} className="btn-ghost !py-2" title="Ubah daftar jenis ukuran (khusus Admin)"><Ruler size={15} />Jenis Ukuran</button>
          )}
          <button onClick={() => exportData('csv')} title="Data tersimpan, hanya pendaftar aktif" className="btn-ghost !py-2"><FileText size={15} />Export CSV</button>
          <button onClick={() => exportData('xlsx')} title="Data tersimpan, hanya pendaftar aktif" className="btn-ghost !py-2"><FileSpreadsheet size={15} />Export Excel</button>
          <button data-keep-edits onClick={save} disabled={!dirtyCount || saving} className="btn-primary !py-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Simpan{dirtyCount ? ` (${dirtyCount})` : ''}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Menampilkan {shown.length} data{dirtyCount ? ` • ${dirtyCount} baris diubah, belum disimpan` : ''}</span>
          {msg && <span className={`rounded-lg px-2.5 py-1 font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</span>}
        </div>
      </div>

      <HScroll className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="th">ID Pendaftaran</th>
              <th rowSpan={2} className="th">Nama</th>
              <th rowSpan={2} className="th text-center">L/P</th>
              <th colSpan={3} className="th border-b border-slate-200 text-center">Ukuran Seragam</th>
              <th className="th border-b border-slate-200">Keterangan</th>
            </tr>
            <tr>
              <th className="th text-center">Atasan (Baju)</th>
              <th className="th text-center">Bawahan (Celana/Rok)</th>
              <th className="th text-center">Kaos Olahraga</th>
              <th className="th">Lain-lain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">Tidak ada data.</td></tr>}
            {shown.map((r) => <Row key={r.id} r={r} e={edits[r.id]} sizes={sizes} onChange={onChange} disabled={saving} />)}
          </tbody>
        </table>
      </HScroll>

      {/* Bilah simpan melayang: selalu terjangkau walau daftar panjang */}
      {dirtyCount > 0 && !panel && (
        <div data-keep-edits className="no-print fixed bottom-20 left-1/2 z-40 lg:bottom-6 flex max-w-[94vw] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300 bg-white px-4 py-2.5 shadow-2xl">
          <span className="text-sm font-semibold text-amber-800">{dirtyCount} perubahan belum disimpan</span>
          <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={saving}
            onClick={() => { if (window.confirm('Buang semua perubahan yang belum disimpan?')) setEdits({}); }}>Batalkan</button>
          <button className="btn-primary !px-3 !py-1.5 !text-xs" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Simpan Semua
          </button>
        </div>
      )}

      <Modal open={panel} onClose={panelContinue} title="Simpan perubahan?" tone="warn">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Ada <b>{dirtyCount} baris</b> ukuran seragam yang sudah diubah tetapi belum disimpan.
          {dirtyNames.length > 0 && (
            <div className="mt-1.5 text-xs">{dirtyNames.slice(0, 5).join(', ')}{dirtyNames.length > 5 ? `, dan ${dirtyNames.length - 5} lainnya` : ''}</div>
          )}
        </div>
        <p className="mt-3 text-sm text-slate-600">Pilih <b>Simpan Semua</b> untuk menyimpan seluruh baris sekaligus, atau <b>Buang</b> untuk membatalkannya.</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={panelContinue} disabled={saving}>Lanjut Mengedit</button>
          <button className="btn-ghost !text-red-600" onClick={panelDiscard} disabled={saving}>Buang Perubahan</button>
          <button className="btn-primary" onClick={panelSave} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Semua'}</button>
        </div>
      </Modal>

      {role === 'ADMIN' && (
        <SizesModal open={sizeModal} onClose={() => setSizeModal(false)} sizes={sizes} usage={usage}
          onSaved={(s) => { setSizes(s); setSizeModal(false); setMsg({ ok: true, text: 'Daftar jenis ukuran diperbarui.' }); }} />
      )}
    </div>
  );
}

// Admin: kelola daftar jenis ukuran (tambah, hapus, ubah urutan) tanpa menyentuh kode.
function SizesModal({ open, onClose, sizes, usage, onSaved }) {
  const [draft, setDraft] = useState(sizes);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setDraft(sizes); setText(''); setErr(''); } }, [open, sizes]);

  function add() {
    const parts = text.split(',').map((x) => x.trim().toUpperCase().replace(/\s+/g, ' ')).filter(Boolean);
    if (!parts.length) return;
    if (parts.some((p) => p.length > 10)) { setErr('Satu ukuran maksimal 10 karakter.'); return; }
    setDraft((d) => [...d, ...parts.filter((p, i) => !d.includes(p) && parts.indexOf(p) === i)]);
    setText(''); setErr('');
  }
  const move = (i, dir) => setDraft((d) => {
    const j = i + dir;
    if (j < 0 || j >= d.length) return d;
    const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  async function submit() {
    if (!draft.length) { setErr('Minimal harus ada 1 jenis ukuran.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/uniform/sizes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sizes: draft }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Gagal menyimpan.'); return; }
      onSaved(j.sizes);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Jenis Ukuran Seragam">
      <p className="text-xs text-slate-500">Urutan di sini = urutan pilihan di tabel. Menghapus ukuran tidak mengubah data siswa yang sudah memakainya (tetap tersimpan, ditandai “tidak aktif”).</p>
      <ul className="mt-3 max-h-[40vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {draft.map((s, i) => (
          <li key={s} className="flex items-center gap-2 px-3 py-1.5">
            <b className="w-14 text-sm">{s}</b>
            <span className="flex-1 text-xs text-slate-500">{usage[s] ? `dipakai ${usage[s]} kali` : ''}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === draft.length - 1} aria-label="Turunkan" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={14} /></button>
            <button type="button" onClick={() => setDraft((d) => d.filter((x) => x !== s))} aria-label={`Hapus ${s}`} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><X size={14} /></button>
          </li>
        ))}
        {draft.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Belum ada jenis ukuran.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        <input className="input up" value={text} placeholder="Tambah ukuran (pisahkan koma: 9, 3XL)" maxLength={60}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn-ghost" onClick={add}><Plus size={15} />Tambah</button>
      </div>
      {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose} disabled={busy}>Batal</button>
        <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Simpan Jenis Ukuran</button>
      </div>
    </Modal>
  );
}
