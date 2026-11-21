import Link from 'next/link';
import { ClipboardEdit, Download, LayoutDashboard, MessageCircle, School, Search } from 'lucide-react';
import Carousel from '@/components/Carousel';
import SocialShowcase from '@/components/SocialShowcase';
import galeri from '@/lib/galeri.json';
import { getSettings } from '@/lib/settings';
import { getUser } from '@/lib/auth';
import { waPanitia } from '@/lib/utils';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [settings, user] = await Promise.all([getSettings(), getUser()]);
  const steps = [
    [ClipboardEdit, 'Isi Formulir Online', 'Lengkapi data calon murid dan orang tua melalui HP atau komputer Anda.'],
    [Download, 'Simpan Tiket', 'Tiket pendaftaran (PNG) otomatis terunduh setelah pendaftaran berhasil.'],
    [School, 'Datang ke Madrasah', 'Bawa tiket dan berkas persyaratan untuk konfirmasi ke panitia.'],
  ];
  return (
    <div className="w-full space-y-8">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white px-4 pb-12 pt-5 text-center shadow-sm sm:px-6 sm:pb-16">
        {/* Galeri foto kegiatan & prestasi siswa: tinggi sama, lebar mengikuti foto, geser otomatis. Foto: public/galery */}
        {galeri.length > 0 && (
          <Carousel autoplay={4500} loop label="Foto kegiatan dan prestasi siswa">
            {galeri.map((g, i) => (
              <figure key={g.src} className="relative m-0 h-44 max-w-[85vw] shrink-0 snap-start overflow-hidden rounded-2xl shadow-md sm:h-56 lg:h-64" style={{ aspectRatio: `${g.w} / ${g.h}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.title} width={g.w} height={g.h} draggable={false} loading={i < 3 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3 pt-10 text-left text-sm font-semibold leading-snug text-white sm:text-base">{g.title}</figcaption>
              </figure>
            ))}
          </Carousel>
        )}
        <div className={galeri.length > 0 ? 'mt-8 sm:mt-10' : 'pt-9 sm:pt-14'}>
          <span className="inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold tracking-wide text-emerald-700 shadow-sm sm:text-lg">{settings.program_name}</span>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">{settings.school_name}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">Daftarkan putra-putri Anda secara mandiri lewat website ini. Mudah, cepat, dan bisa dari mana saja.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/daftar" className="pbtn-primary px-6 py-3.5 text-base">Daftar Sekarang</Link>
            <Link href="/cek-pendaftaran" className="pbtn-soft border border-slate-200 bg-white px-6 py-3.5 text-base"><Search size={18} />Cek Pendaftaran</Link>
            {user && <Link href="/dashboard" className="pbtn-soft px-6 py-3.5 text-base"><LayoutDashboard size={18} />Buka Dashboard</Link>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center font-heading text-2xl font-extrabold">Alur Pendaftaran</h2>
        <div className="grid gap-4 sm:grid-cols-3 xl:gap-6">
          {steps.map(([Icon, t, d], i) => (
            <div key={t} className="pcard">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white"><Icon size={20} /></span>
                <span className="font-heading text-sm font-bold text-slate-400">LANGKAH {i + 1}</span>
              </div>
              <h3 className="font-heading text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 sm:p-6">
        <b>Kesulitan mendaftar online?</b> Anda dapat mengambil formulir tulis tangan di panitia, mengisinya, lalu menyerahkannya kembali. Petugas kami yang akan memasukkan datanya ke sistem.
        <div>
          <a href={waPanitia(settings.committee_whatsapp)} target="_blank" rel="noopener noreferrer" className="pbtn-wa mt-3 !py-2.5">
            <MessageCircle size={16} />Hubungi Panitia
          </a>
        </div>
      </section>

      <SocialShowcase items={settings.social_links} />
    </div>
  );
}
