import { redirect } from 'next/navigation';
import UkuranClient from '@/components/UkuranClient';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ukuran Seragam' };

// Hanya ADMIN dan GURU
export default async function UkuranPage() {
  const user = await getUser();
  if (!user || !['ADMIN', 'GURU'].includes(user.role)) redirect('/dashboard');
  return <UkuranClient role={user.role} />;
}
