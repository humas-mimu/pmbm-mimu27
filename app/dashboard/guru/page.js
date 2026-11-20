import { redirect } from 'next/navigation';
import GuruClient from '@/components/GuruClient';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Akun Guru' };

export default async function GuruPage() {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard/rekap');
  return <GuruClient />;
}
