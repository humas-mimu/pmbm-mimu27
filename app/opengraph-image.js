import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getSettings, getSettingImage } from '@/lib/settings';
import { academicYear } from '@/lib/utils';

// Gambar pratinjau (thumbnail) saat link dibagikan ke WhatsApp / Facebook / Telegram, dll.
// Dibuat otomatis dari Settings: logo + nama madrasah + nama program.
export const dynamic = 'force-dynamic';
export const alt = 'Pendaftaran Murid Baru Madrasah';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ImageResponse hanya mendukung PNG/JPEG/SVG (bukan WEBP) -> selain itu pakai logo bawaan di public/logo
async function logoSrc() {
  const up = (await getSettingImage('logo_url')) || '';
  if (/^data:image\/(png|jpeg|svg\+xml);base64,/.test(up)) return up;
  for (const [f, mime] of [['madrasah.png', 'image/png'], ['madrasah.svg', 'image/svg+xml']]) {
    try {
      const buf = await readFile(path.join(process.cwd(), 'public', 'logo', f));
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {}
  }
  return null;
}

export default async function OgImage() {
  const s = await getSettings();
  const logo = await logoSrc();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)', color: 'white', padding: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 200, borderRadius: 44, background: 'white', padding: 20 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={160} height={160} style={{ objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: '#059669' }}>{(s.school_name || 'M')[0]}</div>
          )}
        </div>
        <div style={{ display: 'flex', marginTop: 32, padding: '10px 28px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 28, fontWeight: 700 }}>
          {`${s.program_name} · TA ${academicYear().label}`}
        </div>
        <div style={{ display: 'flex', marginTop: 26, fontSize: 52, textAlign: 'center', lineHeight: 1.2, maxWidth: 1100 }}>
          {s.school_name}
        </div>
        <div style={{ display: 'flex', marginTop: 26, fontSize: 30, color: '#d1fae5' }}>Daftar online &amp; cek status pendaftaran</div>
      </div>
    ),
    { ...size },
  );
}
