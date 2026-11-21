import { PhoneCall } from 'lucide-react';
import { waPanitia } from '@/lib/utils';

export default function SiteFooter({ settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print mt-12 w-full border-t border-slate-200 bg-white">
      <div className="flex w-full flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-sm lg:px-8 xl:px-10">
        <div className="text-center sm:text-left">
          <span className="font-semibold text-slate-700">&copy; {year} {settings.school_name}</span>
          {settings.school_address && <><span className="mx-2 hidden sm:inline">&bull;</span><span className="mt-0.5 block sm:mt-0 sm:inline">{settings.school_address}</span></>}
        </div>
        <a href={waPanitia(settings.committee_whatsapp)} target="_blank" rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800">
          <PhoneCall size={16} />Hubungi Panitia PMBM
        </a>
      </div>
    </footer>
  );
}
