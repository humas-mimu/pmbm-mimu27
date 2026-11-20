# PMBM — MI Terpadu Manba'ul 'Ulum Buntaran

Website Penerimaan Murid Baru Madrasah (Next.js + Supabase). Bisa di-hosting **gratis** tanpa domain sendiri
(alamat otomatis seperti `pmbm-manbaul-ulum.vercel.app`).

**Jalur pendaftaran ditentukan otomatis oleh sesi login:**
- Formulir ada di `/daftar` (beranda `/` berisi alur pendaftaran). Dibuka tanpa login → `ONLINE` (ID `ONMB-26001`)
- Formulir dibuka saat Admin/Guru login → `OFFLINE` (ID `OFMB-26001`) + checklist berkas

> **Sudah pernah menjalankan `schema.sql` versi lama?** Jalankan sekali, berurutan, di Supabase SQL Editor:
> `supabase/migrations/001_nik_wali_favicon.sql` (kolom NIK Wali & Favicon) dan `supabase/migrations/002_social_links.sql` (konten sosmed Beranda).
> Instalasi baru cukup `schema.sql`.

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
- **Langsung ganti password**: menu *Akun Guru → Reset Password* pada akun admin.
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
- Cek data publik wajib 2 faktor (NIK/ID + tanggal lahir) dan dibatasi percobaannya.
- Modal "NIK sudah terdaftar" (sesuai PRD) menampilkan nama, ID, program, dan waktu daftar bagi siapa pun yang mengetik NIK tersebut.
  Bila dirasa terlalu terbuka, ubah `app/api/check-nik/route.js`.
- Unduh/backup data berkala lewat tombol **Export Excel / CSV** (tersedia untuk Admin dan Guru). Hanya pendaftar **aktif** yang diekspor (arsip tidak ikut); kolom NIK, No. HP, RT, RW, dan Kode Pos berformat *Text* di Excel.
- **Tahun Ajaran** dihitung otomatis dari tanggal pendaftaran: Agustus–Desember → tahun ajaran berikutnya (Nov 2026 = 2027/2028); Januari–Juli → tahun berjalan (Jan 2027 = 2027/2028).
- Password akun disimpan terenkripsi satu arah (tidak bisa dilihat kembali). Lupa password → *Akun Guru → Reset Password* (password baru ditampilkan sekali dan bisa disalin).
