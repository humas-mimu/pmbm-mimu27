-- Jalankan SEKALI di Supabase > SQL Editor.
-- Pembatas percobaan (rate limit) TERDISTRIBUSI: hitungan disimpan di database sehingga berlaku untuk semua
-- instance serverless dan tidak hilang saat cold start (versi lama hanya di memori per-instance).
-- Bila migrasi ini belum dijalankan, aplikasi otomatis memakai pembatas memori (perilaku lama) dan tetap berjalan.
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table rate_limits enable row level security;

-- p_inc >= 1 : tambah hitungan (jendela tetap p_window detik); is_limited = hitungan melebihi p_limit.
-- p_inc  = 0 : hanya mengintip (tidak menambah, tidak membuat baris); is_limited = hitungan sudah mencapai p_limit.
create or replace function rate_hit(p_key text, p_window int, p_limit int, p_inc int default 1)
returns table (is_limited boolean, cur_hits int, retry_after int)
language plpgsql security definer set search_path = public as $$
declare r rate_limits%rowtype;
begin
  if p_inc <= 0 then
    select * into r from rate_limits where key = p_key;
    if not found or r.window_start <= now() - make_interval(secs => p_window) then
      return query select false, 0, 0;
      return;
    end if;
    return query select r.hits >= p_limit, r.hits,
      greatest(1, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window) - now())))::int);
    return;
  end if;

  insert into rate_limits as t (key, window_start, hits) values (p_key, now(), p_inc)
  on conflict (key) do update set
    window_start = case when t.window_start <= now() - make_interval(secs => p_window) then now() else t.window_start end,
    hits         = case when t.window_start <= now() - make_interval(secs => p_window) then p_inc else t.hits + p_inc end
  returning t.* into r;

  -- bersih-bersih ringan: sesekali buang hitungan lama agar tabel tidak membengkak
  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return query select r.hits > p_limit, r.hits,
    greatest(1, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window) - now())))::int);
end $$;

revoke all on function rate_hit(text, int, int, int) from public, anon, authenticated;
grant execute on function rate_hit(text, int, int, int) to service_role;
revoke all on table rate_limits from anon, authenticated;
grant all on table rate_limits to service_role;
