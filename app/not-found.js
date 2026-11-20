import Link from 'next/link';
export const metadata = { title: 'Halaman Tidak Ditemukan' };
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-3xl font-extrabold">Halaman tidak ditemukan</h1>
        <Link href="/" className="btn-primary mt-4">Kembali ke Beranda</Link></div>
    </main>
  );
}
