'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { fmtDateLong, fmtDateTime, yearOf } from '@/lib/utils';
import { useLogoSrc } from './ui';

const H = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const B = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// Tiket ukuran tetap 480x720 (dikonversi menjadi PNG).
export const Ticket = forwardRef(function Ticket({ registrant: r, settings: s }, ref) {
  const logo = useLogoSrc(s);
  const year = yearOf(r.created_at);
  const jalur = r.registration_type === 'ONLINE' ? 'online' : 'offline';
  const label = (t) => ({ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: '#6B7280', textTransform: 'uppercase', ...B });
  return (
    <div ref={ref} style={{ width: 480, height: 720, padding: 6, borderRadius: 24, boxSizing: 'border-box', background: 'linear-gradient(135deg,#6366F1,#A855F7,#F472B6)', ...B }}>
      <div style={{ background: '#fff', borderRadius: 19, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: '#00995D', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 58, height: 58, borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {logo.src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logo.src} onError={logo.onError} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
              : <span style={{ ...H, fontWeight: 800, fontSize: 26, color: '#00995D' }}>{(s.school_name || 'M')[0]}</span>}
          </div>
          <div style={{ ...H, textTransform: 'uppercase', lineHeight: 1.25 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600 }}>PANITIA {s.program_name}</div>
            <div style={{ fontSize: 15, fontWeight: 800, margin: '2px 0' }}>{s.school_name}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700 }}>TAHUN {year}</div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', flex: 1, gap: 9 }}>
          <div style={{ alignSelf: 'center', background: 'linear-gradient(90deg,#4F46E5,#A855F7)', color: '#fff', ...H, fontWeight: 700, fontSize: 12, letterSpacing: 1.2, padding: '5px 18px', borderRadius: 999 }}>
            IDENTITAS PENDAFTARAN
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: '#2563EB', color: '#fff', borderRadius: 12, padding: '9px 12px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, opacity: 0.85 }}>ID PENDAFTARAN</div>
              <div style={{ ...H, fontWeight: 800, fontSize: 23, lineHeight: 1.15 }}>{r.registration_id}</div>
            </div>
            <div style={{ flex: 1, background: '#059669', color: '#fff', borderRadius: 12, padding: '9px 12px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, opacity: 0.85 }}>PROGRAM</div>
              <div style={{ ...H, fontWeight: 800, fontSize: 23, lineHeight: 1.15 }}>{r.program_kelas}</div>
            </div>
          </div>

          {[
            ['NAMA LENGKAP SISWA', r.nama_siswa],
            ['NIK SISWA', r.nik_siswa],
            ['TEMPAT/TANGGAL LAHIR', `${r.tempat_lahir}, ${fmtDateLong(r.tanggal_lahir)}`],
            ['ASAL SEKOLAH', r.asal_sekolah],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#F3F4F6', borderRadius: 10, padding: '6px 12px' }}>
              <div style={label()}>{k}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.25 }}>{v}</div>
            </div>
          ))}

          <div style={{ textAlign: 'center' }}>
            <div style={label()}>TANGGAL PENDAFTARAN</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{fmtDateTime(r.created_at)}</div>
          </div>

          <div style={{ background: '#FEF3C7', border: '1.5px solid #F59E0B', borderRadius: 10, padding: '8px 12px', fontSize: 10.5, color: '#78350F', lineHeight: 1.4 }}>
            <div style={{ ...H, fontWeight: 800, fontSize: 11.5, marginBottom: 3 }}>📄 CATATAN PENTING</div>
            <div>1. Foto Copy Akta Kelahiran Calon Peserta Didik</div>
            <div>2. Foto Copy KTP Kedua Orang Tua (Ayah/Ibu)</div>
            <div>3. Foto Copy Kartu Keluarga</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>Masing-masing 1 (SATU) LEMBAR</div>
            <div>Berkas dikumpulkan saat pengambilan bukti pendaftaran di Madrasah.</div>
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 8.5, color: '#9CA3AF', lineHeight: 1.3 }}>
            © {year} {s.school_name} - Dokumen ini sah sebagai bukti pendaftaran {jalur}
          </div>
        </div>
      </div>
    </div>
  );
});

// Menampilkan tiket yang diskalakan agar muat di layar HP. `innerRef` = node ukuran penuh untuk di-capture.
export function ScaledTicket({ registrant, settings, innerRef }) {
  const wrap = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const w = wrap.current?.parentElement?.clientWidth || 480;
      setScale(Math.min(1, w / 480));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div ref={wrap} style={{ width: 480 * scale, height: 720 * scale, margin: '0 auto' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 480, height: 720 }}>
        <Ticket ref={innerRef} registrant={registrant} settings={settings} />
      </div>
    </div>
  );
}
