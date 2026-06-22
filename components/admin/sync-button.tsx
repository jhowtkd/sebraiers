'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runSyncAction, type SyncActionResult } from '@/app/actions/sync';
import { useToast } from '@/components/ui/toast';

export function SyncButton() {
  const [busy, start] = useTransition();
  const { toast } = useToast();

  function onClick() {
    start(async () => {
      const res: SyncActionResult = await runSyncAction();
      if (!res.ok) {
        toast({
          title: 'Erro na sincronização',
          description: res.error,
          variant: 'error',
        });
        return;
      }
      const s = res.summary;
      const parts: string[] = [];
      if (s.created) parts.push(`${s.created} novos`);
      if (s.updated) parts.push(`${s.updated} atualizados`);
      if (s.skipped_stories) parts.push(`${s.skipped_stories} stories ignoradas`);
      if (s.errors) parts.push(`${s.errors} erros`);
      const description = parts.length > 0
        ? parts.join(', ')
        : 'Nenhum post novo ou atualizado';
      toast({
        title: 'Sincronização concluída',
        description,
        variant: s.errors > 0 ? 'info' : 'success',
      });
    });
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={busy} loading={busy}>
      <RefreshCw className={busy ? 'animate-spin' : ''} />
      Importar agora
    </Button>
  );
}
