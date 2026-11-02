import type { IUser } from '../models/User';
import { clientUrl, TOKEN_TTL_MS } from '../config/auth';
import { sendEmail } from './emailService';
import { verificationEmail, passwordResetEmail, passwordChangedEmail, manuscriptStatusEmail } from './emailTemplates';

/** Each helper resolves to whether the message was handed to the provider; none of them throw. */
async function deliver(to: string, content: ReturnType<typeof verificationEmail>, label: string): Promise<boolean> {
  try {
    await sendEmail({ to, ...content });
    return true;
  } catch (err) {
    console.error(`[email] ${label} not delivered:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export const sendVerificationEmail = (user: Pick<IUser, 'name' | 'email'>, token: string) =>
  deliver(user.email, verificationEmail({ name: user.name, url: clientUrl('/verify-email', { token }) }), 'verification');

export const sendPasswordResetEmail = (user: Pick<IUser, 'name' | 'email'>, token: string) =>
  deliver(
    user.email,
    passwordResetEmail({
      name: user.name,
      url: clientUrl('/reset-password', { token }),
      minutes: Math.round(TOKEN_TTL_MS.passwordReset / 60_000),
    }),
    'password reset'
  );

export const sendPasswordChangedEmail = (user: Pick<IUser, 'name' | 'email'>) =>
  deliver(user.email, passwordChangedEmail({ name: user.name, supportUrl: clientUrl('/contact') }), 'password changed');

export const sendManuscriptStatusEmail = (
  user: Pick<IUser, 'name' | 'email'>,
  details: { bookTitle: string; headline: string; message: string; note?: string; path: string }
) =>
  deliver(
    user.email,
    manuscriptStatusEmail({ name: user.name, ...details, url: clientUrl(details.path) }),
    'manuscript status'
  );
