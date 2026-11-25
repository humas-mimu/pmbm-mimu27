-- Jalankan SEKALI di Supabase > SQL Editor.
-- Wajib ganti password: akun yang bertanda must_change_password = true harus mengganti password
-- sebelum bisa memakai dashboard. Tanda ini diberikan untuk:
--   * akun baru (dibuat Admin), * Guru yang passwordnya direset Admin, * akun admin bawaan yang masih memakai password bawaan.
-- Tanda dihapus otomatis begitu pengguna berhasil mengganti password.
alter table users add column if not exists must_change_password boolean not null default false;

-- Admin bawaan yang MASIH memakai password bawaan -> wajib ganti saat login berikutnya.
-- (Admin yang sudah mengganti passwordnya tidak disentuh. Aman dijalankan ulang.)
update users
   set must_change_password = true
 where username = 'admin'
   and password_hash = extensions.crypt('GantiSegera123!', password_hash);
