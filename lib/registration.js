// Jadwal pendaftaran per gelombang. Murni (tanpa akses DB) -> dipakai server DAN browser.
// Waktu disimpan sebagai ISO UTC; diinput/ditampilkan dalam WIB (Asia/Jakarta, UTC+7).

const WIB_OFFSET_MS = 7 * 3600 * 1000;
export const MAX_WAVES = 10;

// 'YYYY-MM-DDTHH:mm' (WIB, dari <input type="datetime-local">) -> ISO UTC; tidak valid -> null
export function wibInputToIso(v) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(v || ''))) return null;
  const t = new Date(`${v}:00+07:00`).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
// ISO UTC -> 'YYYY-MM-DDTHH:mm' (WIB) untuk <input type="datetime-local">
export function isoToWibInput(iso) {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return '';
  return new Date(t + WIB_OFFSET_MS).toISOString().slice(0, 16);
}

// Contoh: "Senin, 1 Desember 2026 pukul 08.00 WIB"
export function fmtWib(ms) {
  const f = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(ms));
  return `${f.replace(/(\d{4}),? (\d{2}\.\d{2})/, '$1 pukul $2')} WIB`;
}

// Rapikan daftar gelombang (buang yang rusak) & urutkan menurut waktu buka.
export function normalizeWaves(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((w) => ({
      name: String(w?.name || '').trim(),
      open_at: w?.open_at, close_at: w?.close_at,
      openMs: new Date(w?.open_at).getTime(), closeMs: new Date(w?.close_at).getTime(),
    }))
    .filter((w) => w.name && !Number.isNaN(w.openMs) && !Number.isNaN(w.closeMs) && w.closeMs > w.openMs)
    .sort((a, b) => a.openMs - b.openMs);
}

// state: 'open' | 'upcoming' (belum dibuka / antar-gelombang) | 'ended' (semua gelombang selesai)
// Jadwal belum diaktifkan / belum ada gelombang => selalu 'open' (perilaku lama tidak berubah).
export function getRegistrationStatus(settings, now = Date.now()) {
  const waves = normalizeWaves(settings?.registration_waves);
  if (!settings?.registration_schedule_enabled || !waves.length) return { state: 'open', scheduled: false };
  const cur = waves.find((w) => now >= w.openMs && now < w.closeMs);
  if (cur) return { state: 'open', scheduled: true, wave: cur };
  const next = waves.find((w) => w.openMs > now);
  const prev = [...waves].reverse().find((w) => w.closeMs <= now) || null;
  if (next) return { state: 'upcoming', wave: next, prev };
  return { state: 'ended', last: waves[waves.length - 1] };
}

// Validasi kiriman Admin. Return { waves } (ISO UTC, terurut) atau { error }.
export function validateWavesInput(input) {
  if (!Array.isArray(input)) return { error: 'Format jadwal gelombang tidak valid.' };
  if (input.length > MAX_WAVES) return { error: `Maksimal ${MAX_WAVES} gelombang.` };
  const out = [];
  for (const [i, w] of input.entries()) {
    const name = String(w?.name ?? '').trim().slice(0, 60);
    const o = new Date(w?.open_at).getTime();
    const c = new Date(w?.close_at).getTime();
    const label = name || `baris ke-${i + 1}`;
    if (!name) return { error: `Nama gelombang pada baris ke-${i + 1} wajib diisi.` };
    if (Number.isNaN(o) || Number.isNaN(c)) return { error: `Waktu dibuka/ditutup untuk ${label} wajib diisi lengkap.` };
    if (c <= o) return { error: `${label}: waktu ditutup harus setelah waktu dibuka.` };
    out.push({ name, open_at: new Date(o).toISOString(), close_at: new Date(c).toISOString(), openMs: o, closeMs: c });
  }
  out.sort((a, b) => a.openMs - b.openMs);
  for (let i = 1; i < out.length; i++) {
    if (out[i].openMs < out[i - 1].closeMs) return { error: `Jadwal ${out[i - 1].name} dan ${out[i].name} saling tumpang tindih. Atur agar tidak bertabrakan.` };
  }
  return { waves: out.map(({ name, open_at, close_at }) => ({ name, open_at, close_at })) };
}
