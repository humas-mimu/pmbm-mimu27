'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink, Info, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Field, Modal } from './ui';
import { DESC_MAX, PLATFORMS, wantsEmbed } from '@/lib/social';

const COLOR = { instagram: 'violet', tiktok: 'slate', youtube: 'red' };
const KIND = { p: 'Postingan', reel: 'Reels', tv: 'IGTV', video: 'Video', short: 'Shorts' };
const keyOf = (it) => `${it.platform}:${it.id}`;

export default function SosmedClient() {
  const [items, setItems] = useState(null);
  const [max, setMax] = useState(10);
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [edit, setEdit] = useState(null);      // { key, platform, desc, embed }

  const load = useCallback(async () => {
    const r = await fetch('/api/social'); const j = await r.json().catch(() => ({}));
    if (r.ok) { setItems(j.items); setMax(j.max); } else setMsg({ ok: false, t: j.error || 'Gagal memuat.' });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(body, okText) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, t: j.error || 'Gagal.' }); return false; }
      setItems(j.items); if (okText) setMsg({ ok: true, t: okText });
      return true;
    } catch { setMsg({ ok: false, t: 'Tidak dapat terhubung ke server.' }); return false; }
    finally { setBusy(false); }
  }
  async function add(e) {
    e.preventDefault();
    if (await call({ action: 'add', url, desc }, 'Konten ditambahkan. Cek di Beranda.')) { setUrl(''); setDesc(''); }
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (await call({ action: 'update', key: edit.key, desc: edit.desc, embed: edit.embed }, 'Perubahan disimpan.')) setEdit(null);
  }

  if (!items) return <p className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="animate-spin" size={18} />Memuat…</p>;
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold">Konten Media Sosial (Beranda)</h1>
        <Link href="/" target="_blank" className="pbtn-soft !py-2.5 text-xs"><ExternalLink size={14} />Lihat Beranda</Link>
      </div>

      <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p>Tempel link <b>postingan/Reels Instagram</b>, <b>video TikTok</b>, atau <b>YouTube / Shorts</b>; jenisnya dikenali otomatis. Tiap konten tampil dalam <b>satu baris</b> di Beranda: <b>konten di kiri, deskripsi di kanan</b>. Saran: <b>4–6 konten</b> (maksimal {max}). Konten harus <b>publik</b>.</p>
          <p><b>Embed kadang gagal tampil</b> (Instagram sering meminta login; TikTok kadang menolak dengan pesan "Player authentication failed"). Bila itu terjadi, tekan <b>Edit</b> lalu matikan opsi embed: konten tampil sebagai <b>kartu tautan</b> yang pasti tampil dan dibuka di aplikasinya. Instagram secara bawaan memakai kartu tautan.</p>
        </div>
      </div>

      <form onSubmit={add} className="pcard grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <label className="plabel">Link konten</label>
          <input className="pinput" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…  |  https://www.tiktok.com/@akun/video/…  |  https://youtube.com/shorts/…" required />
        </div>
        <div>
          <label className="plabel">Deskripsi (opsional)</label>
          <textarea className="pinput min-h-[46px]" rows={2} maxLength={DESC_MAX} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Tulis keterangan yang tampil di samping konten" />
        </div>
        <button className="pbtn-primary" disabled={busy || items.length >= max}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}Tambah</button>
      </form>
      {msg && <p className={`break-words rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr>{['#', 'Platform', 'Jenis', 'Link', 'Deskripsi', 'Aksi'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-slate-500">Belum ada konten. Bagian ini tidak tampil di Beranda sampai ada konten.</td></tr>}
            {items.map((it, i) => (
              <tr key={keyOf(it)}>
                <td className="td font-bold">{i + 1}</td>
                <td className="td">
                  <Badge color={COLOR[it.platform]}>{PLATFORMS[it.platform]?.label || it.platform}</Badge>
                  <div className="mt-1 text-[11px] text-slate-500">{wantsEmbed(it) ? 'Embed' : 'Kartu tautan'}</div>
                </td>
                <td className="td">{KIND[it.kind] || it.kind}</td>
                <td className="td max-w-[280px] truncate"><a href={it.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">{it.url}</a></td>
                <td className="td !whitespace-normal w-[320px] min-w-[240px]">
                  {it.desc ? <span className="line-clamp-3 text-slate-700">{it.desc}</span> : <span className="text-slate-400">— belum ada deskripsi —</span>}
                </td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" disabled={busy || i === 0} onClick={() => call({ action: 'move', key: keyOf(it), dir: 'up' })} aria-label="Naikkan"><ArrowUp size={13} /></button>
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" disabled={busy || i === items.length - 1} onClick={() => call({ action: 'move', key: keyOf(it), dir: 'down' })} aria-label="Turunkan"><ArrowDown size={13} /></button>
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" disabled={busy} onClick={() => { setMsg(null); setEdit({ key: keyOf(it), platform: it.platform, desc: it.desc || '', embed: wantsEmbed(it) }); }}><Pencil size={13} />Edit</button>
                    <button className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-red-600" disabled={busy} onClick={() => { if (confirm('Hapus konten ini dari Beranda?')) call({ action: 'remove', key: keyOf(it) }, 'Konten dihapus.'); }}><Trash2 size={13} />Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit Konten">
        {edit && (
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Deskripsi" hint={`${edit.desc.length}/${DESC_MAX} karakter. Kosongkan bila tidak ingin menampilkan deskripsi.`}>
              <textarea className="pinput" rows={6} maxLength={DESC_MAX} value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} autoFocus />
            </Field>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={edit.embed} onChange={(e) => setEdit({ ...edit, embed: e.target.checked })} />
              <span>
                <b>Tampilkan sebagai embed</b> (konten bisa diputar langsung di Beranda).{' '}
                <span className="text-slate-600">Matikan bila kotaknya kosong / error: konten tampil sebagai kartu tautan yang pasti tampil.</span>
              </span>
            </label>
            <button className="pbtn-primary w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : null}Simpan</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
