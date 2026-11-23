'use client';
import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Lock, MessageCircle, Timer, UserCheck } from 'lucide-react';
import { fmtWib, getRegistrationStatus } from '@/lib/registration';
import { waPanitia } from '@/lib/utils';

// Jam mengikuti waktu SERVER (bukan jam HP pengunjung): hasil hitung mundur sama untuk semua orang,
// dan render pertama sama dengan HTML server (tanpa hydration mismatch).
export function useRegistrationGate(settings, serverNow) {
  const [now, setNow] = useState(serverNow || 0);
  useEffect(() => {
    if (!serverNow) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => setNow(serverNow + (Date.now() - t0)), 1000);
    return () => clearInterval(id);
  }, [serverNow]);
  return { now, status: serverNow ? getRegistrationStatus(settings, now) : { state: 'open', scheduled: false } };
}

function Unit({ v, l }) {
  return (
    <div className="min-w-[4.25rem] flex-1 rounded-2xl bg-emerald-700 px-2 py-3 text-center text-white shadow-md sm:min-w-[5.25rem] sm:py-4">
      <div className="font-heading text-3xl font-extrabold tabular-nums leading-none sm:text-4xl">{String(v).padStart(2, '0')}</div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 sm:text-xs">{l}</div>
    </div>
  );
}

export function Countdown({ target, now }) {
  const left = Math.max(0, Math.floor((target - now) / 1000));
  return (
    <div className="flex items-stretch justify-center gap-2 sm:gap-3" role="timer" aria-live="off">
      <Unit v={Math.floor(left / 86400)} l="Hari" />
      <Unit v={Math.floor((left % 86400) / 3600)} l="Jam" />
      <Unit v={Math.floor((left % 3600) / 60)} l="Menit" />
      <Unit v={left % 60} l="Detik" />
    </div>
  );
}

// Panel di atas formulir yang di-blur (pendaftaran belum dibuka / sudah berakhir)
export function ClosedPanel({ status, now, settings }) {
  const ended = status.state === 'ended';
  const wa = waPanitia(settings.committee_whatsapp, 'pendaftaran murid baru');
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center px-3 py-6 sm:px-6">
      <div role="alert" className="sticky top-20 w-full max-w-xl overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 text-white sm:px-6 ${ended ? 'bg-gradient-to-r from-slate-700 to-slate-800' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20">{ended ? <Lock size={24} /> : <CalendarClock size={24} />}</span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">{ended ? 'Pendaftaran Online' : 'Formulir Belum Dibuka'}</div>
            <h2 className="font-heading text-lg font-extrabold leading-tight sm:text-xl">
              {ended ? 'Pendaftaran Telah Berakhir' : `Pendaftaran ${status.wave.name} Segera Dibuka`}
            </h2>
          </div>
        </div>

        <div className="space-y-4 p-5 text-center sm:p-6">
          {ended ? (
            <>
              <p className="text-sm leading-relaxed text-slate-700">
                Seluruh gelombang pendaftaran telah ditutup{status.last ? <> (terakhir: <b>{status.last.name}</b>, ditutup {fmtWib(status.last.closeMs)})</> : null}.
                Terima kasih atas antusiasme Bapak/Ibu.
              </p>
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                Silakan hubungi admin untuk informasi lebih lanjut mengenai pendaftaran.
              </p>
            </>
          ) : (
            <>
              {status.prev && (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 sm:text-sm">
                  {status.prev.name} telah ditutup. Menuju {status.wave.name}:
                </p>
              )}
              <div>
                <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <Timer size={14} />Dibuka dalam
                </div>
                <Countdown target={status.wave.openMs} now={now} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                <b>{status.wave.name}</b> dibuka pada<br />
                <span className="font-bold text-slate-900">{fmtWib(status.wave.openMs)}</span><br />
                <span className="text-xs text-slate-500">sampai {fmtWib(status.wave.closeMs)}</span>
              </p>
            </>
          )}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="pbtn-wa w-full">
            <MessageCircle size={18} />Hubungi Admin via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// Pita info di atas formulir: sisa waktu gelombang yang sedang dibuka, atau catatan untuk petugas.
export function ScheduleNotice({ status, now, staff }) {
  if (status.state === 'open' && status.scheduled) {
    return (
      <div className="mb-5 flex flex-col items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" />{status.wave.name} sedang dibuka</div>
        <div className="text-xs font-semibold sm:text-sm">Ditutup {fmtWib(status.wave.closeMs)} · sisa <Remaining target={status.wave.closeMs} now={now} /></div>
      </div>
    );
  }
  if (staff && status.state !== 'open') {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 sm:text-sm">
        <UserCheck size={18} className="shrink-0" />
        <span>Pendaftaran <b>online</b> sedang ditutup untuk umum. Sebagai petugas, Anda tetap dapat menginput pendaftaran <b>offline</b>.</span>
      </div>
    );
  }
  return null;
}

function Remaining({ target, now }) {
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return <b className="tabular-nums">{d > 0 ? `${d} hari ` : ''}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}</b>;
}
