import RegistrationForm from '@/components/RegistrationForm';
import { getSettings } from '@/lib/settings';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Formulir Pendaftaran' };

export default async function DaftarPage() {
  const [settings, user] = await Promise.all([getSettings(), getUser()]);
  // Ada sesi Admin/Guru => jalur OFFLINE (dengan gerbang konfirmasi). Tidak ada sesi => ONLINE.
  const staff = user ? { name: user.name, role: user.role } : null;
  return <RegistrationForm staff={staff} settings={settings} serverNow={Date.now()} />;
}
