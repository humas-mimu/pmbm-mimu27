'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ClipboardList, FileText, Home, LayoutDashboard, LogIn, LogOut, Menu, Search, Settings, Share2, Shirt, Users, X } from 'lucide-react';
import { Logo } from './ui';

export default function SiteHeader({ settings, user }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);     // menu HP
  const [acc, setAcc] = useState(false);       // dropdown akun
  const accRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';
  const canUniform = user?.role === 'ADMIN' || user?.role === 'GURU';   // menu Ukuran Seragam: hanya Admin & Guru

  const links = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/daftar', label: 'Formulir Pendaftaran', icon: FileText },
    { href: '/cek-pendaftaran', label: 'Cek Pendaftaran', icon: Search },
    ...(canUniform ? [{ href: '/dashboard/ukuran-seragam', label: 'Ukuran Seragam', icon: Shirt }] : []),
  ];
  const accountItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/rekap', label: 'Rekap Data', icon: ClipboardList },
    ...(isAdmin ? [
      { href: '/dashboard/guru', label: 'Akun Guru', icon: Users },
      { href: '/dashboard/sosmed', label: 'Konten Sosmed', icon: Share2 },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ] : []),
  ];
  const cls = (href) => (path === href
    ? 'border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
    : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-700');
  const inDash = path.startsWith('/dashboard');

  useEffect(() => { setAcc(false); setOpen(false); }, [path]);
  // Layout tidak dirender ulang saat pindah halaman, jadi `user` bisa basi: sesi habis -> diarahkan ke /login,
  // tetapi header masih menampilkan akun lama. Di /login berarti sesi sudah tidak berlaku -> ambil ulang dari server.
  useEffect(() => { if (user && path === '/login') router.refresh(); }, [user, path, router]);
  useEffect(() => {
    const onDown = (e) => { if (accRef.current && !accRef.current.contains(e.target)) setAcc(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAcc(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setOpen(false); setAcc(false);
    router.push('/login');
    router.refresh();
  }

  return (
    <>
    <header className="no-print sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-20">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><Logo settings={settings} size={40} /></span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-heading text-sm font-extrabold leading-tight text-slate-900 sm:text-lg">{settings.school_name}</span>
              <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-emerald-700 sm:text-xs">{settings.program_name}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${cls(href)}`}>
                <Icon size={16} />{label}
              </Link>
            ))}

            {user ? (
              <div ref={accRef} className="relative ml-3 border-l border-slate-200 pl-4">
                <button type="button" onClick={() => setAcc(!acc)} aria-haspopup="menu" aria-expanded={acc}
                  className={`flex items-center gap-3 rounded-xl border px-2.5 py-1.5 transition ${acc || inDash ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="max-w-[150px] text-left leading-tight">
                    <span className="block truncate text-xs font-bold text-slate-800">{user.name}</span>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-blue-600' : 'text-emerald-700'}`}>{user.role}</span>
                  </span>
                  <ChevronDown size={16} className={`text-slate-500 transition ${acc ? 'rotate-180' : ''}`} />
                </button>
                {acc && (
                  <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                    <div className="mb-1 border-b border-slate-100 px-3 pb-2.5 pt-2">
                      <div className="truncate text-sm font-bold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">Login sebagai {user.role}</div>
                    </div>
                    {accountItems.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} role="menuitem"
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${path === href ? 'bg-emerald-50 font-semibold text-emerald-700' : 'font-medium text-slate-700 hover:bg-slate-50'}`}>
                        <Icon size={16} />{label}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      <LogOut size={16} />Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="ml-3 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"><LogIn size={16} />Login</Link>
            )}
          </nav>

          <button onClick={() => setOpen(!open)} className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 lg:hidden" aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="space-y-1 border-t border-slate-100 pb-4 pt-3 lg:hidden">
            {user ? (
              <div className="mt-2 space-y-1 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-3 px-1 pb-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="leading-tight"><b className="block text-sm text-slate-900">{user.name}</b><span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-blue-600' : 'text-emerald-700'}`}>{user.role}</span></span>
                </div>
                {accountItems.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${cls(href)}`}><Icon size={16} />{label}</Link>
                ))}
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={16} />Logout</button>
              </div>
            ) : (
              <Link href="/login" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><LogIn size={16} />Login</Link>
            )}
          </div>
        )}
      </div>
    </header>

    {/* Navbar bawah khusus HP: ikon saja (nama menu tetap terbaca oleh screen reader & muncul saat ditahan). Di luar <header> karena backdrop-blur-nya memutus posisi fixed. */}
    <nav aria-label="Menu utama" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex h-14 max-w-md items-stretch justify-around px-2">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href} className="flex-1">
            <Link href={href} aria-label={label} title={label} aria-current={path === href ? 'page' : undefined}
              className={`flex h-full items-center justify-center transition ${path === href ? 'text-emerald-700' : 'text-slate-500 hover:text-emerald-700'}`}>
              <span className={`grid h-10 w-12 place-items-center rounded-2xl ${path === href ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}><Icon size={22} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
    </>
  );
}
