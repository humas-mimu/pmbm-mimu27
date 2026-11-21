import { Instagram } from 'lucide-react';

const TikTok = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

export default function SiteFooter({ settings }) {
  const year = new Date().getFullYear();
  // Link diatur Admin di menu Settings; kosong = ikon disembunyikan
  const socials = [
    { url: settings.instagram_url, label: 'Instagram', Icon: Instagram, hover: 'hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600' },
    { url: settings.tiktok_url, label: 'TikTok', Icon: TikTok, hover: 'hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900' },
  ].filter((x) => x.url);
  return (
    <footer className="no-print mt-12 w-full border-t border-slate-200 bg-white">
      <div className="flex w-full flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-sm lg:px-8 xl:px-10">
        <div className="text-center sm:text-left">
          <span className="font-semibold text-slate-700">&copy; {year} {settings.school_name}</span>
          {settings.school_address && <><span className="mx-2 hidden sm:inline">&bull;</span><span className="mt-0.5 block sm:mt-0 sm:inline">{settings.school_address}</span></>}
        </div>
        {socials.length > 0 && (
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="font-semibold text-emerald-700">Kunjungi dan Follow</span>
            {socials.map(({ url, label, Icon, hover }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                className={`grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition ${hover}`}>
                <Icon size={18} className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
