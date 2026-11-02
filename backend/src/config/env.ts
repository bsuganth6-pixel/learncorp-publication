import { allowedOrigins, isProduction } from './auth';
import { isEmailEnabled } from '../services/emailService';

/** Refuses to boot a production server whose settings would silently break sign-in, CSRF checks or email links. */
export function assertRuntimeConfig(): void {
  if (!isProduction()) return;

  const problems: string[] = [];
  if (!process.env.CLIENT_URL) {
    problems.push('CLIENT_URL is not set. It is the site origin used for CORS, CSRF checks and the links in emails.');
  } else {
    for (const origin of allowedOrigins()) {
      if (!origin.startsWith('https://')) problems.push(`CLIENT_URL origin "${origin}" must be https:// in production (the session cookie is Secure).`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n - ${problems.join('\n - ')}`);
  }

  if (!isEmailEnabled()) {
    console.warn(
      '[config] EMAIL_PROVIDER is not set. Sign-up confirmation and password-reset emails cannot be delivered, so authors cannot verify their email or recover a password. See docs/DEPLOYMENT.md.'
    );
  }
}
