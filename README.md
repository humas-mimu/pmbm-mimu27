# PMBM — MI Terpadu Manba'ul 'Ulum Buntaran

Website Penerimaan Murid Baru Madrasah (Next.js + Supabase). Bisa di-hosting **gratis** tanpa domain sendiri
(alamat otomatis seperti `pmbm-manbaul-ulum.vercel.app`).

**Jalur pendaftaran ditentukan otomatis oleh sesi login:**
- Formulir ada di `/daftar` (beranda `/` berisi alur pendaftaran). Dibuka tanpa login → `ONLINE` (ID `ONMB-26AM-K7M4`)
- Formulir dibuka saat Admin/Guru login → `OFFLINE` (ID `OFMB-26AM-K7M4`) + checklist berkas

> **Sudah pernah menjalankan `schema.sql` versi lama?** Jalankan sekali, berurutan, di Supabase SQL Editor:
> `supabase/migrations/001_nik_wali_favicon.sql` (kolom NIK Wali & Favicon) dan `supabase/migrations/002_social_links.sql` (konten sosmed Beranda).
> Lalu jalankan juga `supabase/migrations/003_ukuran_seragam.sql` (fitur Ukuran Seragam). Instalasi baru cukup `schema.sql`.
> Migrasi lain, jalankan berurutan bila belum: `004_footer_sosmed.sql` (tautan Instagram/TikTok footer) dan `005_jadwal_gelombang.sql` (jadwal gelombang pendaftaran).
> Jalankan juga `supabase/migrations/006_token_version.sql` (pencabutan sesi login) bila database dibuat sebelum versi ini.
> Jalankan juga `supabase/migrations/007_rate_limit.sql` (pembatas percobaan terdistribusi). Tanpa migrasi ini situs tetap jalan, tetapi pembatas hanya berlaku per-instance (di log muncul peringatan `[ratelimit]`).
> Jalankan juga `supabase/migrations/008_must_change_password.sql` (wajib ganti password saat login pertama). Tanpa migrasi ini situs tetap jalan, tetapi tidak ada paksaan ganti password. Migrasi ini juga menandai akun `admin` yang masih memakai password bawaan.

## A. Siapkan database (Supabase, gratis)
1. Daftar di https://supabase.com → **New project** (catat password database, pilih region Singapore).
   Saat membuat proyek: **Enable Data API wajib dicentang**. Dua opsi di bawahnya (Grant API access / Enable RLS on new tables) bebas, schema.sql sudah mengatur hak akses dan RLS sendiri. **Connect GitHub tidak perlu** (opsional, tidak dipakai).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
3. Buka **Project Settings → API**, salin:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (rahasia!) → `SUPABASE_SERVICE_ROLE_KEY`

## B. Upload kode ke GitHub
1. Buat repository baru (disarankan **Private**) di https://github.com.
2. Upload seluruh isi folder ini (JANGAN upload file `.env`).

## C. Deploy ke Vercel (gratis)
1. Daftar di https://vercel.com dengan akun GitHub → **Add New → Project** → pilih repository tadi.
2. Pada **Environment Variables**, isi:
   | Nama | Nilai |
   |---|---|
   | `SUPABASE_URL` | dari langkah A |
   | `SUPABASE_SERVICE_ROLE_KEY` | dari langkah A |
   | `AUTH_SECRET` | string acak ≥ 32 karakter (mis. hasil `openssl rand -base64 32`) |
3. Klik **Deploy**. Selesai — alamat website muncul di Vercel. Nama subdomain bisa diubah di *Settings → Domains*.

## D. Login pertama
- Buka `/login` (tombol **Login** di navbar) → username `admin`, password `GantiSegera123!`
- Sistem **memaksa ganti password** saat login pertama (halaman `/ganti-password`); dashboard terkunci sampai password diganti.
- **Login dan ganti password SEKARANG JUGA, sebelum alamat situs dibagikan ke siapa pun.** Password bawaan bersifat publik; siapa pun yang login lebih dulu dapat mengambil alih akun admin.
- Isi menu **Settings** (logo, alamat, link grup WhatsApp, nomor panitia).
- Buat akun Guru/Panitia di menu *Akun Guru*.

## E. Jaga database tetap aktif (penting!)
Database gratis Supabase dijeda bila ±1 minggu tanpa aktivitas. Agar aman:
1. Di GitHub: *Settings → Secrets and variables → Actions → Variables* → buat variabel `SITE_URL`
   berisi alamat website (contoh `https://pmbm-manbaul-ulum.vercel.app`, tanpa garis miring di akhir).
2. Workflow `.github/workflows/keepalive.yml` akan memanggil `/api/health` setiap 3 hari.
   (GitHub bisa menonaktifkan jadwal otomatis bila repo tidak ada aktivitas 60 hari — aktifkan lagi di tab *Actions*.)

## Menjalankan di komputer sendiri (opsional)
```
cp .env.example .env.local   # isi nilainya
npm install
npm run dev                   # http://localhost:3000
```

## Logo madrasah (dua cara)
1. **Upload** di menu *Settings* (lalu tekan *Simpan Pengaturan*), atau
2. **File di folder**: ganti `public/logo/madrasah.svg` (atau `madrasah.png`) dengan logo Anda. Untuk memakainya, tekan *Hapus* pada logo di Settings lalu simpan.
Urutan: logo upload → `public/logo/madrasah.svg` → `public/logo/madrasah.png` → huruf pertama nama madrasah.

## Beranda: Galeri Foto & Konten Media Sosial
- **Galeri foto kegiatan/prestasi**: taruh foto di `public/galery` (judul = nama file, awali angka untuk urutan). Tinggi semua foto sama, lebar mengikuti foto,
  geser otomatis tiap ±4,5 detik, tombol ◀ ▶ muncul saat kursor di atasnya. Detail: `public/galery/README.txt`. Hapus foto "Contoh" sebelum live.
  Daftar foto dibuat otomatis saat `npm run dev` / `npm run build` (juga di Vercel).
- **Konten Instagram / TikTok / YouTube**: menu akun → **Konten Sosmed** (Admin). Tempel link + isi *Deskripsi* (opsional); jenisnya dikenali otomatis.
  Tampil satu baris di Beranda: konten di kiri, deskripsi di kanan (saran 4–6 konten, maksimal 10). Konten harus publik.
  Link pendek TikTok (vm.tiktok.com) akan diikuti otomatis; bila gagal, pakai link lengkap.
  **Embed bisa gagal** (Instagram sering meminta login; TikTok kadang menampilkan "Player authentication failed"). Solusi: tombol **Edit** → matikan opsi embed,
  konten tampil sebagai *kartu tautan* yang pasti tampil. Instagram secara bawaan memakai kartu tautan. TikTok memakai embed resmi (embed.js) dan selalu ada tautan "Buka di TikTok".
- Galeri foto berputar tanpa putus (setelah foto terakhir langsung disusul foto pertama).

## Judul tab browser
Judul tab mengikuti halaman yang dibuka, formatnya `<Nama Menu> — PMBM` (mis. *Rekap Data — PMBM*). Halaman Beranda memakai nama madrasah. Judul Bukti Pendaftaran = nama file PDF (`Bukti Pendaftaran - NAMA - ID`). Untuk halaman baru, cukup tambahkan `export const metadata = { title: 'Nama Menu' };` di file `page.js`-nya.

## Rekap Data: cara menggeser tabel lebar
Kontrol geser muncul **hanya saat kursor berada di zonanya**: kursor di bagian **atas** tabel → scrollbar atas; di bagian **bawah** layar → scrollbar bawah
(menempel di dasar layar sehingga selalu terjangkau); di tepi **kanan** → tombol ▶ saja; di tepi **kiri** → tombol ◀ saja. Bisa juga lewat trackpad,
Shift + roda mouse, atau tombol panah keyboard (klik tabel dulu). Di layar sentuh semua kontrol selalu tampil.

## Ukuran Seragam
Menu **Ukuran Seragam** (di kanan *Cek Pendaftaran*, hanya tampil untuk **Admin & Guru**). Pilih ukuran Baju, Celana/Rok & Kaos Olahraga langsung di kolom tabel, isi Lain-lain bila perlu, lalu tekan **Simpan** — semua baris yang diedit tersimpan sekaligus (satu transaksi).
Klik di luar kolom input saat ada perubahan memunculkan panel *Simpan / Buang / Lanjut Mengedit*. Ada pencarian dan Export Excel/CSV.
Data otomatis tampil di tabel *Ukuran Seragam* pada **Bukti Pendaftaran** dan di hasil **Cek Pendaftaran** (hanya bila sudah diisi).
**Admin** mengubah daftar jenis ukuran lewat tombol **Jenis Ukuran** (tambah/hapus/urutan), tanpa mengubah kode.

## Akun Guru
Admin dapat mengubah Nama, Username, dan Role (tombol **Edit**), mereset password, serta menonaktifkan akun. Role akun sendiri tidak dapat diturunkan.

## Rekomendasi Asal Sekolah
Daftar ada di `public/data/sekolah.txt` (satu nama sekolah per baris). Tambah/ubah barisnya sesuai kebutuhan lalu deploy ulang.
Saat mengetik, daftar yang mengandung huruf tersebut muncul; bila tidak ada, pendaftar bebas mengetik sendiri.

## Favicon & QR Code
- Favicon bisa di-upload di Settings, atau ganti file `public/favicon.svg` (lihat `public/logo/README.txt`).
- Bukti Pendaftaran memuat QR Code yang otomatis berisi *Link Grup WhatsApp* dari Settings.

## Alamat bertingkat (Jawa Timur)
Pilihan Kabupaten/Kota → Kecamatan → Desa memakai data resmi Kemendagri (Kepmendagri 300.2.2-2138 Tahun 2025, sumber: github.com/cahyadsn/wilayah, lisensi MIT)
yang sudah disertakan di folder `public/wilayah/` (38 kab/kota, 666 kecamatan, 8.494 desa, lengkap dengan kode pos). Tidak membutuhkan layanan luar.
Kolom Kabupaten/Kota, Kecamatan, dan Desa memberi **rekomendasi saat mengetik** (cukup ketik sebagian nama), dan boleh diisi manual bila tidak ada di daftar atau di luar Jawa Timur.

## Catatan keamanan
- Database dikunci (RLS tanpa policy); seluruh akses lewat server memakai service role key — **jangan pernah** membagikan key ini.
- Cek Pendaftaran publik memakai **NIK siswa + soal pengaman** (soal hitung bawaan, tanpa akun/kunci pihak ketiga; angka ditulis dengan kata; bertanda tangan HMAC dengan `AUTH_SECRET`, berlaku 10 menit, **satu soal = satu percobaan**) dan dibatasi 10 percobaan/menit per IP. Soal ini hanya menahan bot sederhana; siapa pun yang tahu NIK anak dapat melihat data yang tampil (nama, TTL, asal sekolah, nama ortu, status berkas, ukuran seragam, no. HP tersamarkan). NIK orang tua & alamat tidak pernah dikirim (`cekRegistrant` di `lib/utils.js`). Bila `AUTH_SECRET` berganti, soal yang sedang tampil otomatis tidak berlaku (halaman memuat soal baru).
- Input formulir dibatasi di server (`MAX_LEN` di `lib/validate.js`, dipakai juga sebagai `maxLength` di formulir): nama 100, alamat jalan 150, kota/kecamatan/desa/tempat lahir 60 karakter; karakter kontrol & tak terlihat dibuang; body permintaan publik dibatasi (register 16 KB, cek/login 2 KB → HTTP 413).
- Ekspor CSV mengawali sel yang diawali `= + - @` (tab/CR) dengan tanda `'` agar tidak dibaca Excel sebagai rumus. XLSX tidak terpengaruh (sel selalu teks).
- Pembatas percobaan (login, cek pendaftaran, cek NIK, daftar) disimpan di database (tabel `rate_limits`, fungsi `rate_hit`), jadi berlaku lintas instance serverless. Batas: login 10/menit per IP; daftar 15/menit; cek 10/menit; cek NIK 30/menit.
- Penguncian login: 5 kegagalan/15 menit per (akun + IP) dan 30 kegagalan/jam per akun (semua IP). Kegagalan dihitung sama untuk akun yang tidak ada, jadi tidak membocorkan keberadaan akun. Konsekuensi: orang lain dapat mengunci login satu akun sementara (maks. 1 jam) dengan sengaja gagal dari banyak IP; sesi yang sudah login tidak terpengaruh. Ubah angkanya di `app/api/auth/login/route.js`.
- IP klien dibaca dari `x-vercel-forwarded-for` / `x-real-ip` (diisi platform), lalu entri PALING KANAN `x-forwarded-for`. Di Vercel ini aman. Bila di-host sendiri di belakang nginx, set `proxy_set_header X-Real-IP $remote_addr;` agar klien tidak bisa memalsukan IP. Banyak pengguna di satu Wi-Fi? Naikkan `RATE_LIMIT_MULTIPLIER` (lihat `.env.example`).
- Formulir pendaftaran punya honeypot (kolom tersembunyi `kontak_alt`); bila terisi, pendaftaran ditolak.
- Wajib ganti password (`must_change_password`): akun baru buatan Admin (Guru maupun Admin) dan Guru yang passwordnya direset Admin harus membuat password baru saat login berikutnya; Admin hanya sekali (login pertama). Reset password Admin lain/diri sendiri tidak memaksa ulang. Selama belum diganti, akun itu dianggap belum login (dashboard, API staf, dan mode petugas di formulir terkunci). Password baru: min. 8 karakter, bukan username, bukan password umum/bawaan; berhasil ganti = sesi di perangkat lain dicabut. Guru yang sudah ada sebelum fitur ini tidak dipaksa; untuk memaksa semuanya: `update users set must_change_password = true where role = 'GURU';`
- Format ID: `<JALUR>-<tahun><inisial 2 huruf>-<kode acak 4>`. Inisial = huruf pertama dua kata depan nama (1 kata: dua huruf pertama). Kode acak (tanpa I/L/O/U) adalah bagian yang dirahasiakan; ID tidak berubah walau nama diedit. ID lama `ONMB-26001` tetap diterima. Tabel `counters`/`next_seq` tidak dipakai lagi (dibiarkan).
- Modal "NIK sudah terdaftar" (sesuai PRD) menampilkan nama, ID, program, dan waktu daftar bagi siapa pun yang mengetik NIK tersebut.
  Bila dirasa terlalu terbuka, ubah `app/api/check-nik/route.js`.
- Unduh/backup data berkala lewat tombol **Export Excel / CSV** (tersedia untuk Admin dan Guru). Hanya pendaftar **aktif** yang diekspor (arsip tidak ikut); kolom NIK, No. HP, RT, RW, dan Kode Pos berformat *Text* di Excel.
- **Tahun Ajaran** dihitung otomatis dari tanggal pendaftaran: Agustus–Desember → tahun ajaran berikutnya (Nov 2026 = 2027/2028); Januari–Juli → tahun berjalan (Jan 2027 = 2027/2028).
- Password akun disimpan terenkripsi satu arah (tidak bisa dilihat kembali). Lupa password → *Akun Guru → Reset Password* (password baru ditampilkan sekali dan bisa disalin).
