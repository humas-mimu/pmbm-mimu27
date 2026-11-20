import RekapClient from '@/components/RekapClient';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rekap Data' };

export default async function RekapPage() {
  const user = await getUser();
  return <RekapClient role={user.role} />;
}
