-- Jalankan SEKALI di Supabase > SQL Editor.
-- Pencabutan sesi: setiap akun punya token_version yang ikut tertanam di cookie login (JWT).
-- Nilainya dinaikkan saat password direset / peran diubah / akun dinonaktifkan-diaktifkan / "keluar dari semua perangkat",
-- sehingga cookie lama langsung tidak berlaku. Sesi yang sedang aktif tetap sah (nilai awal 0 = nilai default).
alter table users add column if not exists token_version int not null default 0;
