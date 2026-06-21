import { LoginForm } from '@/components/forms/login-form';
import { Card, CardBody } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/timeline');
  const { next } = await searchParams;

  return (
    <Card>
      <CardBody>
        <h1 className="text-h3 text-text-primary mb-1">Entrar</h1>
        <p className="text-body-sm text-text-secondary mb-6">Acesse sua conta SEBRAEIERS.</p>
        <LoginForm next={next} />
        <p className="text-body-sm text-text-secondary mt-6 text-center">
          Não tem conta? <Link href="/signup" className="text-brand-azul font-medium hover:underline">Criar conta</Link>
        </p>
      </CardBody>
    </Card>
  );
}
