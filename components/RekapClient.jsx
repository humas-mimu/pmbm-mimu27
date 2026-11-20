'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, FileSpreadsheet, FileText, Loader2, Pencil, Printer, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Badge, Modal } from './ui';
import HScroll from './HScroll';
import { fmtDateShort, fmtDateTime } from '@/lib/utils';
import { exportCsv, exportXlsx } from '@/lib/exportRekap';

const sel = 'input !w-auto !py-2';

export default function RekapClient({ role }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [jalur, setJalur] = useState('ALL');
  const [prog, setProg] = useState('ALL');
  const [cancelRow, setCancelRow] = useState(null);
  const [delRow, setDelRow] = useState(null);       // data yang akan dihapus permanen (khusus Admin)
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/registrants');
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Gagal memuat data.'); return; }
      setRows(j.registrants);
    } catch { setErr('Tidak dapat terhubung ke server.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const a = (rows || []).filter((r) => r.status === 'ACTIVE');
    return [
      ['Pendaftar Aktif', a.length, 'text-emerald-700'],
      ['Jalur Online', a.filter((r) => r.registration_type === 'ONLINE').length, 'text-blue-700'],
      ['Jalur Offline', a.filter((r) => r.registration_type === 'OFFLINE').length, 'text-violet-700'],
      ['Tahfidz', a.filter((r) => r.program_kelas === 'TAHFIDZ').length, 'text-emerald-700'],
      ['Non-Tahfidz', a.filter((r) => r.program_kelas === 'NON-TAHFIDZ').length, 'text-slate-700'],
      ['Arsip / Dibatalkan', (rows || []).filter((r) => r.status === 'CANCELLED').length, 'text-red-700'],
    ];
  }, [rows]);

  const shown = useMemo(() => {
    const k = q.trim().toUpperCase();
    return (rows || []).filter((r) =>
      r.status === tab &&
      (jalur === 'ALL' || r.registration_type === jalur) &&
      (prog === 'ALL' || r.program_kelas === prog) &&
      (!k || r.nama_siswa.includes(k) || r.nik_siswa.includes(k) || r.registration_id.includes(k)));
  }, [rows, tab, q, jalur, prog]);

  async function patch(id, body) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/registrants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { alert(j.error || 'Gagal memperbarui.'); return false; }
      setRows((p) => p.map((x) => (x.id === id ? j.registrant : x)));
      return true;
    } finally { setBusyId(null); }
  }
  function toggle(r, k) {
    patch(r.id, { action: 'checklist', is_akta_kelahiran: r.is_akta_kelahiran, is_ktp_ortu: r.is_ktp_ortu, is_kk: r.is_kk, [k]: !r[k] });
  }
  async function doCancel() {
    if (await patch(cancelRow.id, { action: 'cancel', reason })) { setCancelRow(null); setReason(''); }
  }

  async function doDelete() {
    setBusyId(delRow.id);
    try {
      const r = await fetch(`/api/registrants/${delRow.id}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error || 'Gagal menghapus data.'); return; }
      setRows((p) => p.filter((x) => x.id !== delRow.id));
      setDelRow(null);
    } catch { alert('Tidak dapat terhubung ke server.'); }
    finally { setBusyId(null); }
  }

  function exportData(kind) {
    if (!(rows || []).some((r) => r.status === 'ACTIVE')) { alert('Belum ada pendaftar aktif untuk diekspor.'); return; }
    if (kind === 'xlsx') exportXlsx(rows); else exportCsv(rows);   // hanya pendaftar AKTIF (arsip tidak ikut)
  }

  if (err) return <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{err}</p>;
  if (!rows) return <p className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="animate-spin" size={18} />Memuat data…</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([l, v, c]) => (
          <div key={l} className="card !p-4"><div className="text-xs font-semibold text-slate-500">{l}</div><div className={`font-heading text-3xl font-extrabold ${c}`}>{v}</div></div>
        ))}
      </div>

      <div className="card space-y-3 !p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input className="input !pl-9 up" placeholder="Cari nama siswa / NIK / ID pendaftaran" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={sel} value={jalur} onChange={(e) => setJalur(e.target.value)}>
            <option value="ALL">Semua Jalur</option><option value="ONLINE">Online</option><option value="OFFLINE">Offline</option>
          </select>
          <select className={sel} value={prog} onChange={(e) => setProg(e.target.value)}>
            <option value="ALL">Semua Program</option><option value="TAHFIDZ">Tahfidz</option><option value="NON-TAHFIDZ">Non-Tahfidz</option>
          </select>
          {(role === 'ADMIN' || role === 'GURU') && (
            <>
              <button onClick={() => exportData('csv')} title="Hanya pendaftar aktif" className="btn-ghost !py-2"><FileText size={15} />Export CSV</button>
              <button onClick={() => exportData('xlsx')} title="Hanya pendaftar aktif" className="btn-primary !py-2"><FileSpreadsheet size={15} />Export Excel</button>
            </>
          )}
        </div>
        <div className="flex gap-2 border-b border-slate-200">
          {[['ACTIVE', 'Pendaftar Aktif'], ['CANCELLED', 'Arsip / Dibatalkan (Mengundurkan Diri)']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold ${tab === v ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <div className="text-xs text-slate-500">Menampilkan {shown.length} data</div>
      </div>

      <HScroll className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr>
              {['ID', 'Jalur', 'Program', 'Nama Siswa', 'NIK Siswa', 'TTL', 'JK', 'Agama', 'Asal Sekolah', 'Alamat', 'Ayah / NIK', 'Ibu / NIK', 'Wali', 'No. HP', 'Akta', 'KTP Ortu', 'KK', 'Waktu Daftar', 'Aksi'].map((h) => <th key={h} className="th">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && <tr><td colSpan={19} className="p-8 text-center text-sm text-slate-500">Tidak ada data.</td></tr>}
            {shown.map((r) => {
              const cnt = [r.is_akta_kelahiran, r.is_ktp_ortu, r.is_kk].filter(Boolean).length;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td font-bold">{r.registration_id}</td>
                  <td className="td"><Badge color={r.registration_type === 'ONLINE' ? 'blue' : 'violet'}>{r.registration_type}</Badge></td>
                  <td className="td"><Badge color={r.program_kelas === 'TAHFIDZ' ? 'green' : 'slate'}>{r.program_kelas}</Badge></td>
                  <td className="td font-semibold">{r.nama_siswa}</td>
                  <td className="td">{r.nik_siswa}</td>
                  <td className="td">{r.tempat_lahir}, {fmtDateShort(r.tanggal_lahir)}</td>
                  <td className="td">{r.jenis_kelamin === 'LAKI-LAKI' ? 'L' : 'P'}</td>
                  <td className="td">{r.agama}</td>
                  <td className="td">{r.asal_sekolah}</td>
                  <td className="td">{r.jalan_dusun}, RT {r.rt}/RW {r.rw}, {r.desa_kelurahan}, {r.kecamatan}, {r.kabupaten_kota} {r.kode_pos}</td>
                  <td className="td">{r.nama_ayah} / {r.nik_ayah}</td>
                  <td className="td">{r.nama_ibu} / {r.nik_ibu}</td>
                  <td className="td">{r.wali_siswa}{r.nama_wali_lain ? ` (${r.nama_wali_lain}${r.nik_wali ? ` / ${r.nik_wali}` : ''})` : ''}</td>
                  <td className="td">{r.no_hp_wali}</td>
                  {[['is_akta_kelahiran'], ['is_ktp_ortu'], ['is_kk']].map(([k]) => (
                    <td key={k} className="td text-center">
                      <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={r[k]} disabled={busyId === r.id} onChange={() => toggle(r, k)} aria-label={k} />
                    </td>
                  ))}
                  <td className="td">{fmtDateTime(r.created_at)}</td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      {cnt > 0
                        ? <Link href={`/dashboard/cetak/${r.id}`} className="btn-ghost !px-2.5 !py-1.5 !text-xs" title="Cetak Bukti Pendaftaran"><Printer size={13} />Cetak</Link>
                        : <button disabled className="btn-ghost !px-2.5 !py-1.5 !text-xs" title="Centang minimal 1 persyaratan berkas untuk mencetak Bukti Pendaftaran."><Printer size={13} />Cetak</button>}
                      <Link href={`/dashboard/edit/${r.id}`} className="btn-ghost !px-2.5 !py-1.5 !text-xs"><Pencil size={13} />Edit</Link>
                      {r.status === 'ACTIVE'
                        ? <button onClick={() => { setCancelRow(r); setReason(''); }} className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-red-600"><Archive size={13} />Cancel</button>
                        : <button onClick={() => patch(r.id, { action: 'restore' })} disabled={busyId === r.id} className="btn-ghost !px-2.5 !py-1.5 !text-xs"><RotateCcw size={13} />Pulihkan</button>}
                      {role === 'ADMIN' && (
                        <button onClick={() => setDelRow(r)} disabled={busyId === r.id} title="Hapus permanen (khusus Admin)" aria-label="Hapus permanen"
                          className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-red-600 hover:!bg-red-50"><Trash2 size={14} /></button>
                      )}
                    </div>
                    {cnt === 0 && <div className="mt-1 max-w-[230px] whitespace-normal text-[10px] text-amber-700">Centang minimal 1 persyaratan berkas untuk mencetak Bukti Pendaftaran.</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HScroll>

      <Modal open={!!delRow} onClose={() => setDelRow(null)} title="Hapus Data Permanen?" tone="warn">
        {delRow && (
          <>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <b>{delRow.nama_siswa}</b> ({delRow.registration_id}){delRow.status === 'CANCELLED' ? ' — data arsip' : ' — pendaftar aktif'} akan dihapus <b>PERMANEN</b> dari database dan <b>tidak bisa dikembalikan</b>.
            </div>
            <p className="mt-3 text-sm text-slate-600">Gunakan hanya untuk data spam atau bekas percobaan. Bila siswa sekadar mengundurkan diri, pakai <b>Cancel (Arsip)</b> agar datanya tetap tersimpan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDelRow(null)}>Batal</button>
              <button className="btn-danger" onClick={doDelete} disabled={busyId === delRow.id}>{busyId === delRow.id ? 'Menghapus…' : 'Ya, Hapus Permanen'}</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!cancelRow} onClose={() => setCancelRow(null)} title="Arsipkan Pendaftar?">
        {cancelRow && (
          <>
            <p className="text-sm text-slate-600"><b>{cancelRow.nama_siswa}</b> ({cancelRow.registration_id}) akan dipindahkan ke tab Arsip. Data <b>tidak dihapus</b> dan bisa dipulihkan kapan saja.</p>
            <label className="label mt-3">Alasan (opsional)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: pindah sekolah / mengundurkan diri" />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setCancelRow(null)}>Batal</button>
              <button className="btn-danger" onClick={doCancel} disabled={busyId === cancelRow.id}>Ya, Arsipkan</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
