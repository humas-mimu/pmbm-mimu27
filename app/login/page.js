import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { getSessionUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Login' };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.must_change_password ? '/ganti-password' : '/dashboard');
  return <LoginForm />;
}
