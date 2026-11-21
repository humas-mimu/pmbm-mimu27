-- Jalankan SEKALI di Supabase > SQL Editor. Tautan "Kunjungi dan Follow" di footer (diatur Admin di menu Settings).
alter table school_settings add column if not exists instagram_url text default 'https://www.instagram.com/mimu.buntaran';
alter table school_settings add column if not exists tiktok_url    text default 'https://www.tiktok.com/@mimu.buntaran';
-- Baris Settings yang sudah ada langsung terisi akun bawaan (@mimu.buntaran):
update school_settings set
  instagram_url = coalesce(instagram_url, 'https://www.instagram.com/mimu.buntaran'),
  tiktok_url    = coalesce(tiktok_url,    'https://www.tiktok.com/@mimu.buntaran')
where id = 1;
