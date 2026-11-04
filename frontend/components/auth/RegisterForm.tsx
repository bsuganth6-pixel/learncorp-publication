'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { register as registerAccount, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { meetsPasswordRules } from '@/lib/password';
import { safeSiteRedirect } from '@/lib/safe-redirect';
import { TextField, PasswordField } from '@/components/ui/fields';
import Alert from '@/components/ui/Alert';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().regex(/^[0-9+()\-\s.]{6,30}$/, 'Enter a valid phone number').optional().or(z.literal('')),
    password: z.string().refine(meetsPasswordRules, 'Your password doesn’t meet the rules below'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    acceptTerms: z.boolean().refine((v) => v, 'You must accept the terms and conditions'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Values = z.infer<typeof schema>;
type Field = keyof Values;

export default function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [serverError, setServerError] = useState<{ message: string; duplicate: boolean } | null>(null);

  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = async (values: Values) => {
    setServerError(null);
    try {
      const { data, emailSent } = await registerAccount({ ...values, phone: values.phone || undefined });
      setUser(data);
      const next = safeSiteRedirect(params.get('next'), '/author/dashboard');
      const target = next === '/author/dashboard' ? `/author/dashboard?welcome=1&mail=${emailSent ? 1 : 0}` : next;
      router.replace(target);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        // Show the server's field-level reasons next to the fields they belong to.
        const fields = err.fieldErrors;
        const known = (Object.keys(fields) as string[]).filter((f): f is Field => f in values);
        known.forEach((f) => setError(f, { message: fields[f] }));
        if (known.length === 0) setServerError({ message: err.message, duplicate: err.status === 409 });
      } else {
        setServerError({ message: 'We couldn’t create your account right now. Please try again.', duplicate: false });
      }
    }
  };

  const password = watch('password');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <Alert tone="error">
          {serverError.message}
          {serverError.duplicate && (
            <> <Link href="/login">Sign in</Link> or <Link href="/forgot-password">reset your password</Link>.</>
          )}
        </Alert>
      )}

      <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <TextField label="Email address" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register('email')} />
      <TextField label="Phone number (optional)" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
      <PasswordField label="Password" autoComplete="new-password" strengthOf={password} error={errors.password?.message} {...register('password')} />
      <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5" aria-invalid={errors.acceptTerms ? true : undefined} {...register('acceptTerms')} />
          I agree to the terms and conditions of manuscript submission.
        </label>
        {errors.acceptTerms && <p role="alert" className="field-error">{errors.acceptTerms.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full">
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Create author account
      </button>
    </form>
  );
}
