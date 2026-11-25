import { redirect } from 'next/navigation';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { getSessionUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ganti Password' };

export default async function GantiPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <ChangePasswordForm name={user.name} forced={!!user.must_change_password} />;
}
