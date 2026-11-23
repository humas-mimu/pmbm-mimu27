import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';
import { getUser } from '@/lib/auth';
import { getSettingsFresh } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard/rekap');
  return <SettingsClient initial={await getSettingsFresh()} />;
}
