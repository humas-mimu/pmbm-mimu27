import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function DashLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/ganti-password');   // wajib ganti password dulu
  return children;
}
