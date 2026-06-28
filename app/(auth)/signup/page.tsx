import { SignupForm } from '@/components/forms/signup-form';
import { Card, CardBody } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function SignupPage() {
  const user = await getSession();
  if (user) redirect('/timeline');

  return (
    <Card>
      <CardBody>
        <h1 className="text-h3 text-text-primary mb-1">Criar conta</h1>
        <p className="text-body-sm text-text-secondary mb-6">Comece a engajar com o SEBRAE Goiás.</p>
        <SignupForm />
        <p className="text-body-sm text-text-secondary mt-6 text-center">
          Já tem conta? <Link href="/login" className="text-brand-azul font-medium hover:underline">Entrar</Link>
        </p>
      </CardBody>
    </Card>
  );
}
