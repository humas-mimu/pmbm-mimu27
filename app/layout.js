import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getSettings } from '@/lib/settings';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// Alamat dasar situs: wajib agar og:image berupa URL lengkap (https://...) yang bisa dibaca WhatsApp.
// Isi env NEXT_PUBLIC_SITE_URL bila memakai domain sendiri (mis. https://pmbm.madrasahku.sch.id).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://pmbm-mimu.vercel.app');

export async function generateMetadata() {
  const s = await getSettings();
  const v = s.updated_at ? new Date(s.updated_at).getTime() : 0;
  const dyn = `/api/favicon?v=${v}`; // favicon hasil upload (ganti versi agar tidak tertahan cache)
  const desc = `Pendaftaran Murid Baru Madrasah (PMBM) ${s.school_name} — daftar online dan cek status pendaftaran.`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `Beranda — ${s.school_name}`, template: '%s — PMBM' },   // tiap halaman cukup mengisi nama menunya
    description: desc,
    openGraph: { type: 'website', locale: 'id_ID', siteName: s.school_name, title: `${s.program_name} — ${s.school_name}`, description: desc },
    twitter: { card: 'summary_large_image' },
    icons: s.favicon_url
      ? { icon: [{ url: dyn }], shortcut: [{ url: dyn }], apple: [{ url: dyn }] }
      : { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: 'any' }], apple: [{ url: '/apple-touch-icon.png' }] },
  };
}
export const viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const [settings, user] = await Promise.all([getSettings(), getUser()]);
  const staff = user ? { name: user.name, role: user.role } : null;
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-50 pb-16 lg:pb-0 font-sans text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <SiteHeader settings={settings} user={staff} />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">{children}</main>
        <SiteFooter settings={settings} />
        <WhatsAppFloat settings={settings} />
      </body>
    </html>
  );
}
