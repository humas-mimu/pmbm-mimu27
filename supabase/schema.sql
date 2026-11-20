-- =====================================================================
-- PMBM MI Terpadu Manba'ul 'Ulum Buntaran — Skema Database (PostgreSQL / Supabase)
-- Jalankan SELURUH isi file ini di Supabase > SQL Editor > New query > Run
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists school_settings (
  id int primary key default 1 check (id = 1),
  school_name text not null default 'MI Terpadu Manba''ul ''Ulum Buntaran',
  school_address text not null default '',
  program_name text not null default 'PMBM (Penerimaan Murid Baru Madrasah)',
  logo_url text,                       -- data URL gambar (disimpan langsung, tanpa storage terpisah)
  favicon_url text,                    -- data URL favicon (opsional; kosong = pakai public/favicon.svg)
  social_links jsonb not null default '[]'::jsonb,  -- daftar konten Instagram/TikTok/YouTube di Beranda
  whatsapp_group_link text,
  committee_whatsapp text not null default '6285163088163',
  updated_at timestamptz not null default now()
);
insert into school_settings (id) values (1) on conflict (id) do nothing;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique not null,
  password_hash text not null,
  role text not null default 'GURU' check (role in ('ADMIN','GURU')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists registrants (
  id uuid primary key default gen_random_uuid(),
  registration_id text unique not null,            -- ONMB-26001 / OFMB-26001
  registration_type text not null check (registration_type in ('ONLINE','OFFLINE')),
  program_kelas text not null check (program_kelas in ('TAHFIDZ','NON-TAHFIDZ')),

  nama_siswa text not null,
  nik_siswa varchar(16) unique not null,
  tempat_lahir text not null,
  tanggal_lahir date not null,
  jenis_kelamin text not null check (jenis_kelamin in ('LAKI-LAKI','PEREMPUAN')),
  agama text not null,
  asal_sekolah text not null,

  rt varchar(5) not null,
  rw varchar(5) not null,
  jalan_dusun text not null,
  desa_kelurahan text not null,
  kecamatan text not null,
  kabupaten_kota text not null,
  kode_pos varchar(10) not null,

  nama_ayah text not null,
  nik_ayah varchar(16) not null,
  nama_ibu text not null,
  nik_ibu varchar(16) not null,
  wali_siswa text not null check (wali_siswa in ('AYAH','IBU','ORANG LAIN')),
  nama_wali_lain text,
  nik_wali varchar(16),                  -- diisi bila wali = ORANG LAIN
  no_hp_wali varchar(20) not null,

  is_akta_kelahiran boolean not null default false,
  is_ktp_ortu boolean not null default false,
  is_kk boolean not null default false,

  status text not null default 'ACTIVE' check (status in ('ACTIVE','CANCELLED')),
  cancel_reason text,
  input_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists registrants_status_idx on registrants(status);
create index if not exists registrants_created_idx on registrants(created_at desc);

-- Penomoran urut ID pendaftaran (atomik, aman untuk pendaftar bersamaan)
create table if not exists counters (key text primary key, value int not null default 0);

create or replace function next_seq(p_key text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into counters(key, value) values (p_key, 1)
  on conflict (key) do update set value = counters.value + 1
  returning value into v;
  return v;
end $$;
revoke all on function next_seq(text) from public, anon, authenticated;

-- KEAMANAN: aktifkan RLS tanpa policy => kunci publik (anon) tidak bisa membaca/menulis apa pun.
-- Seluruh akses data hanya lewat server Next.js memakai service role key.
alter table school_settings enable row level security;
alter table users            enable row level security;
alter table registrants      enable row level security;
alter table counters         enable row level security;

-- HAK AKSES API: hanya SERVER (service_role) yang boleh memakai tabel/fungsi ini; anon & authenticated tidak punya akses sama sekali.
-- Dibuat eksplisit agar tetap benar walau opsi "Grant API access to new tables automatically" dimatikan saat membuat proyek Supabase.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function next_seq(text) to service_role;
revoke all on all tables in schema public from anon, authenticated;

-- Akun Admin awal. SEGERA ganti password setelah login pertama!
--   username: admin      password: GantiSegera123!
insert into users (name, username, password_hash, role)
values ('Administrator', 'admin', extensions.crypt('GantiSegera123!', extensions.gen_salt('bf', 10)), 'ADMIN')
on conflict (username) do nothing;
