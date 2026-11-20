'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// Kolom isian dengan rekomendasi: cukup ketik sebagian nama (mis. "S"), daftar yang mengandung huruf itu langsung muncul.
// Pilihan boleh diambil dari rekomendasi, atau biarkan teks ketikan sendiri (manual) bila tidak ada di daftar.
export default function Combo({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef(null);
  const listRef = useRef(null);
  const q = value.trim().toUpperCase();

  const list = useMemo(() => {
    if (!options.length) return [];
    if (!q) return options.slice(0, 200);
    const out = [];
    for (const o of options) { const i = o.indexOf(q); if (i >= 0) out.push([i, o]); }
    out.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
    return out.slice(0, 60).map((x) => x[1]);
  }, [q, options]);

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { setAct(0); }, [q]);
  useEffect(() => { listRef.current?.children[act]?.scrollIntoView({ block: 'nearest' }); }, [act]);

  const exactOnly = list.length === 1 && list[0] === q;
  const show = open && list.length > 0 && !exactOnly;
  const pick = (o) => { onChange(o); setOpen(false); };

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAct((a) => Math.min(a + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && show) { e.preventDefault(); pick(list[act]); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input
        className="pinput" role="combobox" aria-expanded={show} aria-autocomplete="list" autoComplete="off"
        value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey}
      />
      {show && (
        <ul ref={listRef} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {list.map((o, idx) => {
            const i = q ? o.indexOf(q) : -1;
            return (
              <li key={o} role="option" aria-selected={idx === act}
                onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setAct(idx)}
                className={`cursor-pointer px-4 py-2 text-sm font-medium ${idx === act ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'}`}>
                {i >= 0 ? <>{o.slice(0, i)}<b className="text-emerald-700">{o.slice(i, i + q.length)}</b>{o.slice(i + q.length)}</> : o}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
