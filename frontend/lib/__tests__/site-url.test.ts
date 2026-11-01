import { describe, expect, it } from 'vitest';
import { getSiteUrl } from '../site-url';

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe('getSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes', () => {
    expect(getSiteUrl(env({ NEXT_PUBLIC_SITE_URL: 'https://learncorp.example/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' }))).toBe(
      'https://learncorp.example'
    );
  });

  it('falls back to the production hostname Vercel injects', () => {
    expect(getSiteUrl(env({ VERCEL_PROJECT_PRODUCTION_URL: 'learncorp-publication-blond.vercel.app' }))).toBe(
      'https://learncorp-publication-blond.vercel.app'
    );
  });

  it('falls back to localhost for local development', () => {
    expect(getSiteUrl(env({}))).toBe('http://localhost:3000');
  });

  it('ignores blank values', () => {
    expect(getSiteUrl(env({ NEXT_PUBLIC_SITE_URL: '  ' }))).toBe('http://localhost:3000');
  });
});
