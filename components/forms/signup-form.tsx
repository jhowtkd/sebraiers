'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@/lib/validation';
import { signUpAction, type ActionResult } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} className="w-full">Criar conta</Button>;
}

export function SignupForm() {
  const { register, formState: { errors } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(signUpAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="full_name" required>Nome completo</Label>
        <Input id="full_name" autoComplete="name" {...register('full_name')} aria-invalid={!!errors.full_name} />
        {errors.full_name && <p className="text-caption text-state-error-strong mt-1">{errors.full_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="username" required>Usuário</Label>
        <Input id="username" autoComplete="username" {...register('username')} aria-invalid={!!errors.username} />
        {errors.username && <p className="text-caption text-state-error-strong mt-1">{errors.username.message}</p>}
      </div>
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-caption text-state-error-strong mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password" required>Senha</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-caption text-state-error-strong mt-1">{errors.password.message}</p>}
        <p className="text-caption text-text-muted mt-1">Mínimo 8 caracteres.</p>
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
