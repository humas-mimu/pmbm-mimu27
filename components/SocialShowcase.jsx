import { Instagram, Music2, Youtube } from 'lucide-react';
import Carousel from './Carousel';
import TikTokEmbed from './TikTokEmbed';
import { PLATFORMS, embedSrc, parseSocialUrl, wantsEmbed } from '@/lib/social';

const KIND = { p: 'Postingan', reel: 'Reels', tv: 'IGTV', video: 'Video', short: 'Shorts' };
const EMBED_H = { instagram: 660, tiktok: 584, youtube: 583 };   // tinggi kartu embed per platform
const CARD_H = 520;                                                 // tinggi kartu tautan
const CARD = {
  instagram: { Icon: Instagram, bg: 'bg-gradient-to-br from-fuchsia-600 via-pink-500 to-amber-400', btn: 'text-pink-600', name: 'Instagram' },
  tiktok: { Icon: Music2, bg: 'bg-gradient-to-br from-slate-950 via-slate-800 to-cyan-900', btn: 'text-slate-900', name: 'TikTok' },
  youtube: { Icon: Youtube, bg: 'bg-gradient-to-br from-red-700 via-red-600 to-orange-500', btn: 'text-red-600', name: 'YouTube' },
};

// Kartu tautan (tanpa embed): selalu tampil walau embed platform sedang bermasalah / meminta login
function LinkCard({ it, link }) {
  const c = CARD[it.platform];
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={`group flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center text-white ${c.bg}`}>
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/20 ring-1 ring-white/40"><c.Icon size={42} /></span>
      <div>
        <div className="font-heading text-xl font-extrabold">{KIND[it.kind] || 'Konten'} {c.name}</div>
        <p className="mt-1 text-sm text-white/90">Ketuk untuk melihatnya langsung di {c.name}</p>
      </div>
      <span className={`rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-lg transition group-hover:scale-105 ${c.btn}`}>Buka di {c.name} ↗</span>
    </a>
  );
}

// Satu baris: setiap konten (portrait) di kiri + deskripsi dari Admin di kanan. Di HP: konten di atas, deskripsi di bawah.
export default function SocialShowcase({ items }) {
  const list = (Array.isArray(items) ? items : [])
    .map((it) => ({ it, src: embedSrc(it), link: parseSocialUrl(it.url)?.url }))
    .filter((x) => x.src && x.link);
  if (!list.length) return null;
  return (
    <section>
      <div className="mb-5 text-center">
        <h2 className="font-heading text-2xl font-extrabold">Ikuti Kegiatan Kami</h2>
        <p className="mt-1 text-sm text-slate-600">Konten terbaru dari media sosial madrasah. Geser ke samping untuk melihat lainnya.</p>
      </div>
      <Carousel label="Konten media sosial madrasah">
        {list.map(({ it, src, link }) => {
          const meta = PLATFORMS[it.platform];
          const desc = String(it.desc || '').trim();
          const embed = wantsEmbed(it);
          return (
            <div key={`${it.platform}:${it.id}`} className="flex shrink-0 snap-start flex-col gap-4 sm:flex-row">
              {/* AREA KONTEN */}
              <div className="w-[328px] shrink-0">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: embed ? EMBED_H[it.platform] : CARD_H }}>
                  {!embed ? <LinkCard it={it} link={link} />
                    : it.platform === 'tiktok' ? <TikTokEmbed id={it.id} url={link} />
                    : <iframe src={src} title={`${meta.label} madrasah`} loading="lazy" scrolling="no" className="h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
                </div>
                {/* Tautan cadangan: selalu ada bila embed gagal tampil */}
                {embed && !desc && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-slate-600 hover:text-emerald-700">Buka di {meta.label} ↗</a>
                )}
              </div>
              {/* AREA DESKRIPSI KONTEN */}
              {desc && (
                <aside className="flex max-h-[400px] min-h-[180px] w-[328px] shrink-0 flex-col self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:w-[300px] lg:w-[340px]">
                  <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>{meta.label} · {KIND[it.kind] || 'Konten'}</span>
                  <p className="mt-4 flex-1 overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{desc}</p>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="pbtn-soft mt-5 self-start !py-2.5 text-sm">Buka di {meta.label} ↗</a>
                </aside>
              )}
            </div>
          );
        })}
      </Carousel>
    </section>
  );
}
