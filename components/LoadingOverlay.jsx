'use client';
import { useEffect, useRef, useState } from 'react';

const MIN_MS = 700; // tampil minimal sebentar agar tidak berkedip pada proses yang sangat cepat

export default function LoadingOverlay({ open, title = 'Memproses…', messages = [] }) {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const since = useRef(0);

  useEffect(() => {
    if (open) { since.current = Date.now(); setShow(true); setI(0); return undefined; }
    if (!since.current) return undefined;
    const t = setTimeout(() => setShow(false), Math.max(0, MIN_MS - (Date.now() - since.current)));
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!show || messages.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 1700);
    return () => clearInterval(t);
  }, [show, messages.length]);

  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="no-print ld-fade-in fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="ld-panel w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="ld-scene mx-auto" aria-hidden="true">
          <span className="ld-ring" /><span className="ld-ring ld-ring-2" />
          <svg className="ld-star" viewBox="0 0 24 24"><path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z" fill="#fde047" stroke="#f59e0b" strokeWidth="1" /></svg>
          <span className="ld-spark" style={{ left: 20, top: 10 }} />
          <span className="ld-spark" style={{ right: 18, top: 22, animationDelay: '.6s' }} />
          <span className="ld-spark" style={{ right: 42, top: 2, animationDelay: '1.1s', width: 6, height: 6 }} />
          <div className="ld-book">
            <span className="ld-cover" />
            <span className="ld-half ld-half-l" /><span className="ld-half ld-half-r" />
            <span className="ld-page" /><span className="ld-page ld-p2" /><span className="ld-page ld-p3" />
          </div>
        </div>
        <h3 className="mt-6 font-heading text-lg font-extrabold text-slate-900">{title}</h3>
        <p key={i} className="ld-msg mt-1 min-h-[1.5rem] text-sm font-medium text-emerald-700">{messages[i] || 'Mohon tunggu sebentar…'}</p>
        <div className="ld-bar mt-5"><span /></div>
        <p className="mt-3 text-[11px] text-slate-400">Mohon jangan menutup halaman ini</p>
      </div>
    </div>
  );
}
