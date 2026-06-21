'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSocialsSchema, type ProfileSocialsInput } from '@/lib/validation';
import { updateSocialsAction, type ActionResult } from '@/app/actions/profile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UserSocials } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>Salvar</Button>;
}

const FIELDS: { key: keyof ProfileSocialsInput; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'seunome' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'seunome' },
  { key: 'facebook', label: 'Facebook', placeholder: 'seunome' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'seunome' },
  { key: 'youtube', label: 'YouTube', placeholder: '@seucanal' },
  { key: 'threads', label: 'Threads', placeholder: 'seunome' },
];

export function ProfileSocialsForm({ initial }: { initial: Partial<UserSocials> }) {
  const { register, formState: { errors } } = useForm<ProfileSocialsInput>({
    resolver: zodResolver(profileSocialsSchema),
    defaultValues: {
      instagram: initial.instagram ?? '', linkedin: initial.linkedin ?? '',
      facebook: initial.facebook ?? '', tiktok: initial.tiktok ?? '',
      youtube: initial.youtube ?? '', threads: initial.threads ?? '',
    },
  });
  const [state, action] = useFormState<ActionResult | null, FormData>(updateSocialsAction, null);
  const { toast } = useToast();

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={() => {
        if (state?.ok) toast({ title: 'Perfil atualizado', variant: 'success' });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => {
          const err = errors[f.key];
          return (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} placeholder={f.placeholder} {...register(f.key)} aria-invalid={!!err} />
              {err && <p className="text-caption text-state-error-strong mt-1">{err.message}</p>}
            </div>
          );
        })}
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          {state.error}
        </p>
      )}
      <div className="flex justify-end"><SubmitBtn /></div>
    </form>
  );
}
