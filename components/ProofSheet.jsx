import QRCode from 'qrcode';
import { academicYear, fmtDateLong, fmtDateLongTitle, fmtDateTime, todayYmd } from '@/lib/utils';
import { Logo } from './ui';
import { hasUniform } from '@/lib/uniform';

const cell = 'border border-slate-400 px-2.5 py-1.5 align-top print:px-2 print:py-1';
const head = 'border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-left font-heading font-bold uppercase print:py-1';
const L = ({ children }) => <td className={`${cell} font-semibold`}>{children}</td>;
const V = ({ children, bold, mono, span }) => (
  <td colSpan={span} className={`${cell} ${bold ? 'font-bold' : ''} ${mono ? 'break-all font-mono' : ''}`}>{children}</td>
);

// Bukti Pendaftaran resmi (A4, 1 halaman). Komponen server: QR Code dibuat di server dari link grup di Settings.
export default async function ProofSheet({ registrant: r, settings: s, petugasName }) {
  const ay = academicYear(r.created_at);
  const check = (ok) => (ok ? '[ ✓ ] ADA' : '[ \u00A0\u00A0 ] BELUM');
  const lain = r.wali_siswa === 'ORANG LAIN';
  const tahfidz = r.program_kelas === 'TAHFIDZ';

  let qr = null;
  if (s.whatsapp_group_link) {
    try { qr = await QRCode.toString(s.whatsapp_group_link, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }); } catch {}
  }

  return (
    <div className="print-sheet flex flex-col gap-5 bg-white p-8 text-slate-900 sm:p-10 print:gap-3">
      {/* Kop madrasah + kotak ID Pendaftaran (warna pembeda program) */}
      <div className="flex items-center gap-4 border-b-4 border-double border-slate-900 pb-3">
        <div className="shrink-0"><Logo settings={s} size={72} /></div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-xs font-bold uppercase leading-none tracking-widest text-slate-700">PANITIA {s.program_name.toUpperCase()}</div>
          {/* Skala golden ratio (φ = 1,618): label 12px -> nama madrasah 12 x φ = 19,4px; detail 10px. line-height dikunci agar jarak antarbaris rapat & proporsional */}
          <div className="mt-[3px] font-heading text-[19.4px] font-extrabold uppercase leading-none tracking-tight text-slate-950">{s.school_name.toUpperCase()}</div>
          {s.school_address && <div className="mt-[5px] text-[10px] font-medium leading-tight text-slate-700">{s.school_address}</div>}
          <div className="mt-[2px] text-[10px] font-medium leading-tight text-slate-700">Telp/WA Panitia: +{s.committee_whatsapp} &bull; Tahun Pelajaran {ay.label}</div>
        </div>
        <div className={`shrink-0 rounded-xl px-4 py-2 text-center ${tahfidz ? 'bg-emerald-600 text-white' : 'bg-[#dbe4f4] text-[#3b4fc2]'}`}>
          <div className="text-[9px] font-medium leading-none opacity-80">Id Pendaftaran :</div>
          <div className="mt-1 font-heading text-xl font-extrabold leading-tight tracking-wide">{r.registration_id}</div>
          <div className="my-1 h-px bg-current opacity-30" />
          <div className="text-xs font-bold uppercase tracking-wide">{r.program_kelas}</div>
        </div>
      </div>

      {/* Judul */}
      <h2 className="py-2 text-center font-heading text-lg font-extrabold uppercase tracking-wide underline print:py-3">BUKTI PENDAFTARAN MURID BARU MADRASAH</h2>

      {/* Biodata — 4 kolom: label | isi | label | isi */}
      <table className="w-full table-fixed border-collapse border border-slate-400 text-xs print:text-[11px]">
        <colgroup><col style={{ width: '20%' }} /><col style={{ width: '43%' }} /><col style={{ width: '17%' }} /><col style={{ width: '20%' }} /></colgroup>
        <tbody>
          <tr><th colSpan={4} className={head}>A. IDENTITAS CALON PESERTA DIDIK</th></tr>
          <tr><L>Nama Lengkap Siswa</L><V span={3} bold>{r.nama_siswa}</V></tr>
          <tr><L>NIK Siswa</L><V span={3} bold mono>{r.nik_siswa}</V></tr>
          <tr><L>Tempat, Tgl. Lahir</L><V span={3}>{r.tempat_lahir}, {fmtDateLong(r.tanggal_lahir)}</V></tr>
          <tr><L>Jenis Kelamin</L><V>{r.jenis_kelamin}</V><L>Agama</L><V>{r.agama}</V></tr>
          <tr><L>Asal Sekolah</L><V span={3}>{r.asal_sekolah}</V></tr>
          <tr><L>Alamat Lengkap</L><V span={3}>{r.jalan_dusun}, RT {r.rt} / RW {r.rw}, Desa/Kel. {r.desa_kelurahan}, Kec. {r.kecamatan}, {r.kabupaten_kota} - Kode Pos {r.kode_pos}</V></tr>
          <tr><th colSpan={4} className={head}>B. IDENTITAS ORANG TUA &amp; WALI</th></tr>
          <tr><L>Nama Ayah</L><V>{r.nama_ayah}</V><L>NIK Ayah</L><V mono>{r.nik_ayah}</V></tr>
          <tr><L>Nama Ibu</L><V>{r.nama_ibu}</V><L>NIK Ibu</L><V mono>{r.nik_ibu}</V></tr>
          <tr><L>Wali Siswa</L><V>{r.wali_siswa}</V><L>No. HP / WA Wali</L><V bold>{r.no_hp_wali}</V></tr>
          {lain && <tr><L>Nama Wali</L><V>{r.nama_wali_lain}</V><L>NIK Wali</L><V mono>{r.nik_wali || '-'}</V></tr>}
          <tr><L>Waktu Pendaftaran</L><V span={3} mono>{fmtDateTime(r.created_at)}</V></tr>
        </tbody>
      </table>

      {/* Status berkas */}
      <div className="space-y-2 rounded-lg border border-slate-400 p-3 print:p-2.5">
        <div className="font-heading text-xs font-bold uppercase">C. STATUS VERIFIKASI BERKAS PERSYARATAN</div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[['FC Akta Kelahiran', r.is_akta_kelahiran], ['FC KTP Orang Tua', r.is_ktp_ortu], ['FC Kartu Keluarga', r.is_kk]].map(([k, ok]) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded border border-slate-300 px-3 py-2 print:px-2.5 print:py-1.5 print:text-[11px]">
              <span>{k}</span><strong className="whitespace-nowrap">{check(ok)}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Tanda tangan */}
      <div className="grid grid-cols-2 gap-8 pt-3 text-center text-xs">
        <div className="space-y-14 print:space-y-12">
          <div><div>Mengetahui,</div><div className="font-bold">Orang Tua / Wali Calon Murid</div></div>
          <div className="font-bold underline">( ................................................ )</div>
        </div>
        <div className="space-y-14 print:space-y-12">
          <div><div>Buntaran, {fmtDateLongTitle(todayYmd())}</div><div className="font-bold">Panitia PMBM Madrasah</div></div>
          <div className="font-bold underline">{petugasName || 'PANITIA PMBM'}</div>
        </div>
      </div>

      {/* Ukuran seragam: otomatis terisi dari menu Ukuran Seragam; bila belum diisi, dikosongkan untuk ditulis tangan oleh petugas koperasi */}
      <div className="w-[74mm] rounded-2xl bg-[#dbe4f4] p-3 text-[#3b4fc2]">
        <div className="font-heading text-base font-extrabold uppercase tracking-wide">Ukuran Seragam</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[['ATASAN', r.ukuran_baju], ['BAWAHAN', r.ukuran_bawahan], ['OLAHRAGA', r.ukuran_olahraga]].map(([k, v]) => (
            <div key={k} className="flex h-[17mm] flex-col rounded-lg border border-[#6f86d4] pt-1 text-center">
              <div className="text-[10px] font-extrabold tracking-wide">{k}</div>
              <div className="flex flex-1 items-center justify-center px-1 font-heading text-lg font-extrabold leading-tight text-slate-900 [&>span]:break-words">{v ? <span>{v}</span> : null}</div>
            </div>
          ))}
        </div>
        {!hasUniform(r) && <div className="mt-1.5 text-[9px] font-medium">*diisi oleh petugas koperasi madrasah</div>}
      </div>

      {/* Dasar halaman (ringkas): keterangan dokumen (kiri) + QR Grup WhatsApp kecil (kanan). Tinggi dijaga agar tetap 1 halaman A4 */}
      <div className="mt-auto flex items-center justify-between gap-4 border-t border-dashed border-slate-300 pt-2">
        <p className="max-w-[68%] text-left text-[10px] leading-snug text-slate-500">
          Dokumen ini dicetak dari Sistem PMBM {s.school_name}. Simpan bukti ini dan bawa saat konfirmasi di madrasah.
        </p>
        {qr && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right text-[9px] font-bold leading-tight">Scan untuk Join<br />Grup WhatsApp</div>
            <div className="h-[22mm] w-[22mm] shrink-0 bg-white p-[1mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        )}
      </div>
    </div>
  );
}
