'use client';
import { Children, cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Satu baris yang bisa digeser. Tombol ◀ ▶ muncul saat kursor di atasnya (selalu tampil di layar sentuh).
// loop     : berputar tanpa putus (item terakhir langsung disusul item pertama yang masuk dari kanan), tanpa "lompat ke awal".
// autoplay : jeda dalam milidetik; berhenti saat kursor di atasnya / tab tidak aktif / pengguna memilih "kurangi animasi".
export default function Carousel({ children, autoplay = 0, loop = false, label = 'Carousel', className = '' }) {
  const box = useRef(null);
  const setW = useRef(0);          // lebar satu set item (termasuk jarak ke set berikutnya)
  const started = useRef(false);
  const idle = useRef(null);
  const resume = useRef(null);
  const [canScroll, setCanScroll] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copies, setCopies] = useState(1);

  const items = Children.toArray(children);
  const n = items.length;

  const measure = useCallback(() => {
    const el = box.current;
    if (!el || n === 0) return;
    const first = el.children[0], last = el.children[n - 1];
    if (!first || !last) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const one = last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
    setW.current = one;
    const need = one - gap > el.clientWidth + 4;           // hanya bergeser bila item melebihi lebar layar
    setCanScroll(need);
    const want = loop && need ? Math.max(3, Math.ceil(el.clientWidth / one) + 2) : 1;
    setCopies((c) => (c === want ? c : want));
  }, [n, loop]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [measure]);

  // Mode loop: posisi aktif selalu di "set tengah"; saat berhenti bergulir, loncat (tak terlihat) ke set yang setara.
  const normalize = useCallback(() => {
    const el = box.current, w = setW.current;
    if (!loop || !el || !w || copies < 3) return;
    const l = el.scrollLeft;
    const target = w + ((((l - w) % w) + w) % w);
    if (Math.abs(target - l) > 1) el.scrollTo({ left: target, behavior: 'instant' });
  }, [loop, copies]);

  useEffect(() => {
    const el = box.current;
    if (!loop || !el) return;
    if (copies >= 3) {
      if (!started.current && setW.current) { el.scrollTo({ left: setW.current, behavior: 'instant' }); started.current = true; }
      else normalize();
    } else started.current = false;
  }, [copies, loop, normalize]);

  const onScroll = () => {
    if (!loop) return;
    clearTimeout(idle.current);
    idle.current = setTimeout(normalize, 120);
  };

  const go = useCallback((dir) => {
    const el = box.current;
    if (!el) return;
    const kids = Array.from(el.children);
    const left = el.scrollLeft;
    if (dir > 0) {
      if (!loop && left + el.clientWidth >= el.scrollWidth - 4) { el.scrollTo({ left: 0, behavior: 'smooth' }); return; }
      const next = kids.find((k) => k.offsetLeft > left + 4);
      el.scrollTo({ left: next ? next.offsetLeft : el.scrollWidth, behavior: 'smooth' });
    } else {
      if (!loop && left <= 4) { el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }); return; }
      const prev = [...kids].reverse().find((k) => k.offsetLeft < left - 4);
      el.scrollTo({ left: prev ? prev.offsetLeft : 0, behavior: 'smooth' });
    }
  }, [loop]);

  useEffect(() => {
    if (!autoplay || paused || !canScroll) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => { if (!document.hidden) go(1); }, autoplay);
    return () => clearInterval(t);
  }, [autoplay, paused, canScroll, go]);

  const touchPause = () => { setPaused(true); clearTimeout(resume.current); resume.current = setTimeout(() => setPaused(false), 7000); };
  const arrow = 'absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-black/5 transition hover:bg-white focus-visible:opacity-100 opacity-0 group-hover/car:opacity-100 [@media(hover:none)]:opacity-100';

  // Salinan item (mode loop) disembunyikan dari pembaca layar
  const rendered = [];
  for (let c = 0; c < copies; c += 1) {
    items.forEach((child) => rendered.push(c === 0 ? child : cloneElement(child, { key: `${child.key}__c${c}`, 'aria-hidden': true })));
  }

  return (
    <div className={`group/car relative ${className}`} role="region" aria-roledescription="carousel" aria-label={label}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={touchPause}>
      <div ref={box} onScroll={onScroll}
        className={`relative flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${canScroll ? '' : 'justify-center'}`}>
        {rendered}
      </div>
      {canScroll && (
        <>
          <button type="button" aria-label="Sebelumnya" onClick={() => go(-1)} className={`${arrow} left-2`}><ChevronLeft size={22} /></button>
          <button type="button" aria-label="Berikutnya" onClick={() => go(1)} className={`${arrow} right-2`}><ChevronRight size={22} /></button>
        </>
      )}
    </div>
  );
}
