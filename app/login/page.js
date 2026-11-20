import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Login' };

export default async function LoginPage() {
  if (await getUser()) redirect('/dashboard');
  return <LoginForm />;
}
