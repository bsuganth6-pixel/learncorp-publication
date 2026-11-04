'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Laptop, ShieldCheck } from 'lucide-react';
import {
  updateProfile, changePassword, getSessions, revokeSession, logoutEverywhere, ApiClientError,
} from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { meetsPasswordRules } from '@/lib/password';
import { isAdminRole } from '@/lib/roles';
import { formatDate, formatDateTime, initials } from '@/lib/utils';
import type { AuthUser, SessionInfo } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { TextField, PasswordField } from '@/components/ui/fields';
import ResendVerification from './ResendVerification';

// ------------------------------------------------------------------ profile

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  phone: z.string().trim().regex(/^[0-9+()\-\s.]{6,30}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  website: z.string().trim().max(200).refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'Enter a full address starting with https://').optional(),
  bio: z.string().trim().max(1000, 'Keep your bio under 1,000 characters').optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileCard({ user }: { user: AuthUser }) {
  const { state, setUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');
  const admin = isAdminRole(user.role);

  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone, website: user.website, bio: user.bio },
  });

  const onSubmit = async (values: ProfileValues) => {
    setSaved(false);
    setServerError('');
    try {
      const { data } = await updateProfile({ name: values.name, phone: values.phone ?? '', ...(admin ? {} : { website: values.website ?? '', bio: values.bio ?? '' }) });
      setUser({ ...data, unreadNotifications: state.user?.unreadNotifications });
      reset({ name: data.name, phone: data.phone, website: data.website, bio: data.bio });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.fieldErrors).length > 0) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field as keyof ProfileValues, { message }));
      } else {
        setServerError(err instanceof ApiClientError ? err.message : 'We couldn’t save your profile. Please try again.');
      }
    }
  };

  return (
    <section className="rounded-sm border border-rule bg-surface p-5 shadow-card sm:p-8" aria-labelledby="profile-heading">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg text-paper" aria-hidden="true">{initials(user.name)}</span>
        <div className="min-w-0">
          <h2 id="profile-heading" className="font-display text-xl text-ink">Profile</h2>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge tone="neutral">{admin ? (user.role === 'superadmin' ? 'Super admin' : 'Administrator') : 'Author'}</Badge>
          <Badge tone={user.status === 'active' ? 'success' : 'danger'}>{user.status === 'active' ? 'Account active' : 'Suspended'}</Badge>
          {!admin && <Badge tone={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? 'Email confirmed' : 'Email not confirmed'}</Badge>}
        </div>
      </div>

      {!admin && !user.emailVerified && (
        <div className="mt-6 space-y-3">
          <Alert tone="warning" title="Confirm your email address">You can browse and edit your profile, but submitting manuscripts needs a confirmed email.</Alert>
          <ResendVerification compact />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
        {serverError && <div className="sm:col-span-2"><Alert tone="error">{serverError}</Alert></div>}
        {saved && <div className="sm:col-span-2"><Alert tone="success">Profile saved.</Alert></div>}
        <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <TextField label="Email address" value={user.email} readOnly className="sm:col-span-2" hint="Your sign-in email can’t be changed here. Contact us if you need to move to a new address." />
        {!admin && (
          <>
            <TextField label="Website" type="url" inputMode="url" placeholder="https://" className="sm:col-span-2" error={errors.website?.message} {...register('website')} />
            <div className="sm:col-span-2">
              <label htmlFor="bio" className="field-label">Bio</label>
              <textarea id="bio" rows={4} className="field-input" aria-invalid={errors.bio ? true : undefined} {...register('bio')} />
              <div className="mt-1 flex justify-between text-xs text-ink-soft">
                <span>Used as the starting point for your public author page when your first book is published.</span>
                <span>{(watch('bio') ?? '').length}/1000</span>
              </div>
              {errors.bio && <p role="alert" className="field-error">{errors.bio.message}</p>}
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save changes
          </button>
          <p className="mt-3 text-xs text-ink-soft">Member since {formatDate(user.createdAt)}{user.lastLoginAt ? ` · Last sign-in ${formatDateTime(user.lastLoginAt)}` : ''}</p>
        </div>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ password

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: z.string().refine(meetsPasswordRules, 'Your password doesn’t meet the rules below'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.password !== d.currentPassword, { path: ['password'], message: 'Choose a password you haven’t used here before' });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, watch, setError, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: PasswordValues) => {
    setDone(false);
    setServerError('');
    try {
      await changePassword(values);
      reset();
      setDone(true);
      onChanged(); // other devices were just signed out: refresh the list
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.fieldErrors).length > 0) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => setError(field as keyof PasswordValues, { message }));
      } else {
        setServerError(err instanceof ApiClientError ? err.message : 'We couldn’t change your password. Please try again.');
      }
    }
  };

  return (
    <section className="rounded-sm border border-rule bg-surface p-5 shadow-card sm:p-8" aria-labelledby="password-heading">
      <h2 id="password-heading" className="font-display text-xl text-ink">Password</h2>
      <p className="mt-1 text-sm text-ink-soft">Changing it signs you out everywhere else.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 max-w-md space-y-5">
        {serverError && <Alert tone="error">{serverError}</Alert>}
        {done && <Alert tone="success">Password updated. Your other devices have been signed out.</Alert>}
        <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <PasswordField label="New password" autoComplete="new-password" strengthOf={watch('password')} error={errors.password?.message} {...register('password')} />
        <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Change password
        </button>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ sessions

function SessionsCard({ reloadKey }: { reloadKey: number }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getSessions().then((r) => setSessions(r.data)).catch(() => setError('We couldn’t load your sessions.'));
  }, []);
  useEffect(() => { load(); }, [load, reloadKey]);

  const leave = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const end = async (session: SessionInfo) => {
    setBusy(session.id);
    setError('');
    try {
      await revokeSession(session.id);
      if (session.current) await leave();
      else load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'We couldn’t end that session.');
    } finally {
      setBusy(null);
    }
  };

  const endAll = async () => {
    setBusy('all');
    try {
      await logoutEverywhere();
      await leave();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'We couldn’t sign you out everywhere.');
      setBusy(null);
    }
  };

  return (
    <section className="rounded-sm border border-rule bg-surface p-5 shadow-card sm:p-8" aria-labelledby="sessions-heading">
      <div className="flex items-start gap-3">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
        <div>
          <h2 id="sessions-heading" className="font-display text-xl text-ink">Where you’re signed in</h2>
          <p className="mt-1 text-sm text-ink-soft">If you don’t recognise one, end it and change your password.</p>
        </div>
      </div>

      {error && <Alert tone="error" className="mt-5">{error}</Alert>}

      <ul className="mt-6 divide-y divide-rule rounded-sm border border-rule">
        {sessions === null ? (
          <li className="px-4 py-4 text-sm text-ink-soft">Loading…</li>
        ) : sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <Laptop size={18} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {s.device} {s.current && <Badge tone="gold">This device</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {s.ip && `${s.ip} · `}Last active {formatDateTime(s.lastSeenAt)}{s.persistent ? ' · Remembered' : ''}
                </p>
              </div>
            </div>
            <button type="button" disabled={busy !== null} onClick={() => end(s)} className="btn-outline px-3.5 py-1.5 text-xs">
              {busy === s.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {s.current ? 'Sign out' : 'End session'}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {!confirmAll ? (
          <button type="button" onClick={() => setConfirmAll(true)} className="text-sm font-medium text-ink underline">Sign out of every device</button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink-soft">Sign out everywhere, including this device?</span>
            <button type="button" onClick={endAll} disabled={busy !== null} className="btn-primary px-4 py-2 text-xs">
              {busy === 'all' && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Yes, sign out
            </button>
            <button type="button" onClick={() => setConfirmAll(false)} className="btn-outline px-4 py-2 text-xs">Cancel</button>
          </div>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ page

export default function AccountSettings({ initialUser }: { initialUser: AuthUser }) {
  const { state } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const user = state.user ?? initialUser;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Account &amp; security</h1>
        <p className="mt-1 text-sm text-ink-soft">Your details, your password, and the devices signed in to your account.</p>
      </div>
      <ProfileCard user={user} />
      <PasswordCard onChanged={() => setReloadKey((k) => k + 1)} />
      <SessionsCard reloadKey={reloadKey} />
    </div>
  );
}
