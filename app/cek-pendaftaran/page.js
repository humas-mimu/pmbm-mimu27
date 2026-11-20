import CekClient from '@/components/CekClient';
import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cek Pendaftaran' };

export default async function CekPage() {
  return <CekClient settings={await getSettings()} />;
}
