'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { signInAction, type ActionResult } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} className="w-full">Entrar</Button>;
}

export function LoginForm({ next }: { next?: string }) {
  const { register, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(signInAction, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-caption text-state-error-strong mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password" required>Senha</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-caption text-state-error-strong mt-1">{errors.password.message}</p>}
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
