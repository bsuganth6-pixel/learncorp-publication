/**
 * Canonical origin of this site, without a trailing slash. Used for canonical URLs,
 * Open Graph, the sitemap and robots.txt.
 *
 * Order: NEXT_PUBLIC_SITE_URL (set it when you attach a custom domain), then the
 * production hostname Vercel injects (VERCEL_PROJECT_PRODUCTION_URL, no protocol),
 * then localhost for local development.
 */
export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}
