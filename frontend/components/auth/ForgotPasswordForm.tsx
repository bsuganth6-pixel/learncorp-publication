'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { forgotPassword, ApiClientError } from '@/lib/api-client';
import { TextField } from '@/components/ui/fields';
import Alert from '@/components/ui/Alert';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: Values) => {
    setServerError('');
    try {
      await forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  // The wording never says whether the address has an account: the API answers identically either way.
  if (sentTo) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Check your inbox">
          If an account exists for <strong className="text-ink">{sentTo}</strong>, we’ve sent a link to choose a new password.
          It works once and expires in 30 minutes.
        </Alert>
        <p className="text-sm text-ink-soft">Nothing arrived? Check your spam folder, or <button type="button" className="font-medium text-ink underline" onClick={() => setSentTo(null)}>try another address</button>.</p>
        <Link href="/login" className="btn-outline w-full">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <TextField label="Email address" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register('email')} />
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Send reset link
      </button>
    </form>
  );
}
