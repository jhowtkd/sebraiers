import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-display text-text-primary">404</h1>
      <p className="mt-2 text-body text-text-secondary">Página não encontrada.</p>
      <Link href="/" className="mt-6"><Button>Voltar ao início</Button></Link>
    </div>
  );
}