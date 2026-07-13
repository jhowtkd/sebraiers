'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { NETWORK_LABELS, type Network } from '@/lib/types';
import type { UseFormRegister } from 'react-hook-form';
import type { PostInput } from '@/lib/validation';

export function PostFormFields({ register }: { register: UseFormRegister<PostInput> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title" required>Título</Label>
        <Input id="title" {...register('title')} />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="network" required>Rede social</Label>
          <Select id="network" {...register('network')}>
            {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => <option key={n} value={n}>{NETWORK_LABELS[n]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="published_at" required>Data de publicação</Label>
          <Input id="published_at" type="datetime-local" {...register('published_at')} />
        </div>
      </div>
      <div>
        <Label htmlFor="original_url" required>URL original</Label>
        <Input id="original_url" type="url" {...register('original_url')} />
      </div>
      <div>
        <Label htmlFor="cover_file">Imagem de capa (opcional, máx 5MB)</Label>
        <Input
          id="cover_file"
          name="cover_file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-caption text-text-muted mt-1">Ou cole uma URL abaixo.</p>
        <Input id="cover_url" type="url" placeholder="https://…" {...register('cover_url')} className="mt-2" />
      </div>
    </div>
  );
}