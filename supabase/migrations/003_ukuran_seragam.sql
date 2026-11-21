-- Jalankan SEKALI di Supabase > SQL Editor jika database Anda dibuat dari schema.sql versi lama.
-- Fitur: Ukuran Seragam (input massal oleh Admin/Guru, tampil di Bukti Pendaftaran & Cek Pendaftaran).
alter table registrants     add column if not exists ukuran_baju     text;   -- ukuran atasan (Baju)
alter table registrants     add column if not exists ukuran_bawahan  text;   -- ukuran Celana/Rok
alter table registrants     add column if not exists ukuran_olahraga text;   -- ukuran Kaos Olahraga
alter table registrants     add column if not exists ukuran_lain     text;   -- Keterangan / lain-lain (teks bebas)
alter table school_settings add column if not exists uniform_sizes   jsonb not null
  default '["5","6","7","7+","8","S","S+","M","L","XL","XXL"]'::jsonb;      -- daftar jenis ukuran (diubah Admin lewat menu)

-- Simpan banyak baris sekaligus dalam SATU transaksi (semua tersimpan atau tidak sama sekali)
create or replace function save_uniform_sizes(p_items jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update registrants r
     set ukuran_baju      = nullif(btrim(i.ukuran_baju), ''),
         ukuran_bawahan   = nullif(btrim(i.ukuran_bawahan), ''),
         ukuran_olahraga  = nullif(btrim(i.ukuran_olahraga), ''),
         ukuran_lain      = nullif(btrim(i.ukuran_lain), ''),
         updated_at     = now()
    from jsonb_to_recordset(p_items) as i(id uuid, ukuran_baju text, ukuran_bawahan text, ukuran_olahraga text, ukuran_lain text)
   where r.id = i.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function save_uniform_sizes(jsonb) from public, anon, authenticated;
grant execute on function save_uniform_sizes(jsonb) to service_role;
