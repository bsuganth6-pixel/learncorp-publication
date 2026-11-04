'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { resetPassword, validateResetToken, ApiClientError } from '@/lib/api-client';
import { meetsPasswordRules } from '@/lib/password';
import { PasswordField } from '@/components/ui/fields';
import Alert from '@/components/ui/Alert';

const schema = z
  .object({
    password: z.string().refine(meetsPasswordRules, 'Your password doesn’t meet the rules below'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Values = z.infer<typeof schema>;

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [link, setLink] = useState<LinkState>(token ? 'checking' : 'invalid');
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Tell people up front if the link is dead, rather than after they have typed a new password.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    validateResetToken(token)
      .then(() => !cancelled && setLink('valid'))
      .catch(() => !cancelled && setLink('invalid'));
    return () => { cancelled = true; };
  }, [token]);

  const onSubmit = async (values: Values) => {
    setServerError('');
    try {
      await resetPassword({ token, ...values });
      router.replace('/login?reset=1');
    } catch (err) {
      if (err instanceof ApiClientError) {
        const fields = err.fieldErrors;
        if (fields.password) setError('password', { message: fields.password });
        else if (fields.confirmPassword) setError('confirmPassword', { message: fields.confirmPassword });
        else setServerError(err.message);
        if (err.status === 400 && !fields.password && !fields.confirmPassword) setLink('invalid');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  if (link === 'checking') {
    return <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Checking your link…</p>;
  }

  if (link === 'invalid') {
    return (
      <div className="space-y-5">
        <Alert tone="error" title="This link can’t be used">
          It may have expired (links last 30 minutes), already been used, or been replaced by a newer one.
        </Alert>
        <Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <PasswordField label="New password" autoComplete="new-password" strengthOf={watch('password')} error={errors.password?.message} {...register('password')} />
      <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <button type="submit" disabled={isSubmitting} className="btn-gold w-full">
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Update password
      </button>
      <p className="text-xs text-ink-soft">You’ll be signed out on every device and asked to sign in again with the new password.</p>
    </form>
  );
}
