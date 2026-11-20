'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ZONE_V = 72;   // tinggi zona atas/bawah (px) tempat scrollbar muncul
const ZONE_H = 96;   // lebar zona kiri/kanan (px) tempat panah muncul

// Pembungkus tabel lebar. Semua kontrol muncul HANYA bila kursor berada di zonanya masing-masing:
//  - kursor di zona ATAS  -> scrollbar atas          - kursor di zona BAWAH -> scrollbar bawah (menempel di dasar layar, selalu terjangkau)
//  - kursor di zona KIRI  -> tombol ◀ saja            - kursor di zona KANAN -> tombol ▶ saja
// Cara lain tetap bisa: trackpad, Shift + roda mouse, tombol panah keyboard (klik tabel dulu). Di layar sentuh semua kontrol tampil.
export default function HScroll({ children, className = '' }) {
  const root = useRef(null);
  const box = useRef(null);
  const top = useRef(null);
  const bot = useRef(null);
  const programmatic = useRef(new WeakMap());
  const [canScroll, setCanScroll] = useState(false);
  const [sw, setSw] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [zone, setZone] = useState({ top: false, bottom: false, left: false, right: false });
  const [touch, setTouch] = useState(false);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setCanScroll(el.scrollWidth > el.clientWidth + 2);
    setSw(el.scrollWidth);
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    const el = box.current;
    if (el) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const mq = window.matchMedia?.('(hover: none)');
    if (!mq) return undefined;
    const f = () => setTouch(mq.matches);
    f(); mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, []);

  // Sinkronkan tabel <-> scrollbar atas <-> scrollbar bawah (perubahan hasil sinkron diabaikan agar tidak saling memantul)
  const onScrollOf = (el) => {
    measure();
    const exp = programmatic.current.get(el);
    if (exp !== undefined && Math.abs(el.scrollLeft - exp) < 2) { programmatic.current.delete(el); return; }
    const l = el.scrollLeft;
    [box.current, top.current, bot.current].forEach((o) => {
      if (o && o !== el && Math.round(o.scrollLeft) !== Math.round(l)) { programmatic.current.set(o, l); o.scrollLeft = l; }
    });
  };

  const onMove = (e) => {
    const r = root.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const visibleBottom = Math.min(r.bottom, window.innerHeight) - r.top;   // bagian bawah yang terlihat di layar
    const z = { top: y < ZONE_V, bottom: y > visibleBottom - ZONE_V, left: x < ZONE_H, right: x > r.width - ZONE_H };
    setZone((p) => (p.top === z.top && p.bottom === z.bottom && p.left === z.left && p.right === z.right ? p : z));
  };
  const onLeave = () => setZone({ top: false, bottom: false, left: false, right: false });

  const step = (dir) => {
    const el = box.current;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const showTop = canScroll && (touch || zone.top);
  const showBottom = canScroll && (touch || zone.bottom);
  const showL = canScroll && !edge.start && (touch || zone.left);
  const showR = canScroll && !edge.end && (touch || zone.right);
  const bar = (on) => `scroll-x overflow-x-auto overflow-y-hidden rounded-full transition-opacity duration-150 ${on ? 'opacity-100' : 'pointer-events-none opacity-0'}`;
  const arrow = (on) => `absolute top-0 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-900/85 text-white shadow-xl ring-1 ring-white/20 backdrop-blur transition hover:bg-slate-900 ${on ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`;

  return (
    <div ref={root} className="relative" onMouseMove={onMove} onMouseLeave={onLeave}>
      {canScroll && (
        <div ref={top} onScroll={(e) => onScrollOf(e.currentTarget)} aria-hidden="true" className={`mb-2 ${bar(showTop)}`}>
          <div style={{ height: 1, width: sw }} />
        </div>
      )}
      {canScroll && (
        <div className="pointer-events-none sticky top-[45vh] z-20 h-0">
          <button type="button" aria-label="Geser ke kiri" aria-hidden={!showL} tabIndex={showL ? 0 : -1} onClick={() => step(-1)} className={`${arrow(showL)} left-2`}><ChevronLeft size={24} /></button>
          <button type="button" aria-label="Geser ke kanan" aria-hidden={!showR} tabIndex={showR ? 0 : -1} onClick={() => step(1)} className={`${arrow(showR)} right-2`}><ChevronRight size={24} /></button>
        </div>
      )}
      <div ref={box} onScroll={(e) => onScrollOf(e.currentTarget)} tabIndex={0} aria-label="Tabel data. Geser ke samping untuk melihat kolom lainnya."
        className={`no-scrollbar overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${className}`}>
        {children}
      </div>
      {canScroll && (
        <div ref={bot} onScroll={(e) => onScrollOf(e.currentTarget)} aria-hidden="true" className={`sticky bottom-1 z-20 mt-2 ${bar(showBottom)}`}>
          <div style={{ height: 1, width: sw }} />
        </div>
      )}
    </div>
  );
}
