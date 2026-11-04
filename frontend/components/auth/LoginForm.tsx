'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { login, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { homeFor } from '@/lib/roles';
import { safeSiteRedirect } from '@/lib/safe-redirect';
import { TextField, PasswordField } from '@/components/ui/fields';
import Alert from '@/components/ui/Alert';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean(),
});
type Values = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, setUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const leaving = useRef(false);
  const next = params.get('next');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Someone who is already signed in has no business on this page.
  useEffect(() => {
    if (state.status === 'authenticated' && !leaving.current) {
      leaving.current = true;
      router.replace(safeSiteRedirect(next, homeFor(state.user.role)));
    }
  }, [state, next, router]);

  const onSubmit = async (values: Values) => {
    setServerError('');
    try {
      const { data } = await login(values.email, values.password, values.rememberMe);
      leaving.current = true;
      setUser(data);
      router.replace(safeSiteRedirect(next, homeFor(data.role)));
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'We couldn’t sign you in right now. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {params.get('reset') === '1' && <Alert tone="success">Your password has been updated. Sign in with the new password.</Alert>}
      {params.get('expired') === '1' && <Alert tone="info">Your session has ended. Please sign in again.</Alert>}
      {serverError && <Alert tone="error">{serverError}</Alert>}

      <TextField label="Email address" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register('email')} />
      <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />

      <div className="flex items-start justify-between gap-4">
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5" {...register('rememberMe')} />
          <span>
            Keep me signed in
            <span className="block text-xs text-ink-soft/80">For up to 30 days. Not on shared computers.</span>
          </span>
        </label>
        <Link href="/forgot-password" className="shrink-0 text-sm font-medium text-gold hover:underline">Forgot password?</Link>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Sign in
      </button>
    </form>
  );
}
