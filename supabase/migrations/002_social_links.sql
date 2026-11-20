-- Jalankan SEKALI di Supabase > SQL Editor jika database Anda dibuat dari schema.sql versi lama.
alter table school_settings add column if not exists social_links jsonb not null default '[]'::jsonb;  -- konten sosmed di Beranda
