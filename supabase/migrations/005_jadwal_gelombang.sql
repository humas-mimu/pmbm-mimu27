-- Jalankan SEKALI di Supabase > SQL Editor.
-- Jadwal pendaftaran per gelombang (diatur Admin di menu Settings).
--   registration_schedule_enabled : true = form online hanya bisa diisi saat ada gelombang yang sedang dibuka
--   registration_waves            : [{ "name": "Gelombang 1", "open_at": "<ISO UTC>", "close_at": "<ISO UTC>" }, ...]
alter table school_settings add column if not exists registration_schedule_enabled boolean not null default false;
alter table school_settings add column if not exists registration_waves jsonb not null default '[]'::jsonb;
