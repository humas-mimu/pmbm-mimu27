import { redirect } from 'next/navigation';
import SosmedClient from '@/components/SosmedClient';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Konten Sosmed' };

export default async function SosmedPage() {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard/rekap');
  return <SosmedClient />;
}
