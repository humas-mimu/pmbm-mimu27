'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={className} data-error={error ? 'true' : undefined}>
      <label className="plabel">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, tone = 'default' }) {
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className={`text-lg font-bold ${tone === 'warn' ? 'text-amber-700' : 'text-slate-900'}`}>{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, color = 'slate' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', violet: 'bg-violet-100 text-violet-800',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${map[color]}`}>{children}</span>;
}

const LOGO_FALLBACKS = ['/logo/madrasah.svg', '/logo/madrasah.png'];

// Urutan: logo upload (Settings) → /logo/madrasah.svg → /logo/madrasah.png → huruf pertama nama madrasah
export function useLogoSrc(settings) {
  const list = [settings.logo_url, ...LOGO_FALLBACKS].filter(Boolean);
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [settings.logo_url]);
  return { src: list[i] || null, onError: () => setI((x) => x + 1) };
}

export function Logo({ settings, size = 40 }) {
  const { src, onError } = useLogoSrc(settings);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} onError={onError} alt={`Logo ${settings.school_name}`} style={{ width: size, height: size }} className="rounded-lg object-contain" />
  ) : (
    <div style={{ width: size, height: size }} className="grid place-items-center rounded-lg bg-brand font-heading text-lg font-extrabold text-white">
      {settings.school_name?.[0] || 'M'}
    </div>
  );
}
