import { notFound } from 'next/navigation';
import RegistrationForm from '@/components/RegistrationForm';
import { db } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit Data Pendaftar' };

export default async function EditPage({ params }) {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const { data } = await db().from('registrants').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  return (
    <div>
      <p className="mb-3 text-center text-sm font-bold text-slate-500">Edit: {data.registration_id} — {data.nama_siswa}</p>
      <RegistrationForm mode="edit" staff={{ name: user.name, role: user.role }} settings={settings} initial={data} registrantId={data.id} />
    </div>
  );
}
