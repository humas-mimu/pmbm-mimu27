-- Jalankan SEKALI di Supabase > SQL Editor jika database Anda dibuat dari schema.sql versi lama.
alter table registrants     add column if not exists nik_wali    varchar(16);  -- NIK wali (jika wali = ORANG LAIN)
alter table school_settings add column if not exists favicon_url text;         -- favicon yang di-upload dari Settings
