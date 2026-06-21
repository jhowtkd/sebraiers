'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-h1 text-text-primary">Algo deu errado</h1>
      <p className="mt-2 text-body text-text-secondary max-w-md">{error.message}</p>
      <Button onClick={reset} className="mt-6">Tentar novamente</Button>
    </div>
  );
}