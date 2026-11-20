'use client';
import { Printer } from 'lucide-react';
export default function PrintButton({ title }) {
  // Chrome/Edge/Safari memakai judul halaman sebagai nama file saat "Simpan sebagai PDF"
  function doPrint() {
    const old = document.title;
    if (title) document.title = title;
    window.addEventListener('afterprint', () => { document.title = old; }, { once: true });
    window.print();
  }
  return (
    <button onClick={doPrint} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 sm:text-sm">
      <Printer size={16} />Cetak Dokumen (Print A4)
    </button>
  );
}
