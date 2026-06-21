import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSocialsForm } from '@/components/forms/profile-socials-form';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: socials } = await supabase.from('user_socials').select('*').eq('user_id', user.id).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Seu perfil</h1>
        <p className="text-body text-text-secondary mt-1">Informe seus handles de redes sociais. Pode editar quando quiser.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Redes sociais</CardTitle></CardHeader>
        <CardBody><ProfileSocialsForm initial={socials ?? {}} /></CardBody>
      </Card>
    </div>
  );
}
