import { allowedOrigins, clientOrigin, clientUrl } from '../auth';
import { assertRuntimeConfig } from '../env';

const withEnv = (vars: Record<string, string | undefined>, fn: () => void) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.entries(vars).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
  try { fn(); } finally { Object.entries(saved).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v))); }
};

describe('client origins', () => {
  it('parses a comma-separated CLIENT_URL, normalising paths and duplicates; the first is canonical', () => {
    withEnv({ CLIENT_URL: 'https://a.example/, https://b.example/path ,https://a.example' }, () => {
      expect(allowedOrigins()).toEqual(['https://a.example', 'https://b.example']);
      expect(clientOrigin()).toBe('https://a.example');
    });
  });

  it('builds email links from CLIENT_URL only, encoding parameters', () => {
    withEnv({ CLIENT_URL: 'https://learncorp.example' }, () => {
      expect(clientUrl('/reset-password', { token: 'a b&c' })).toBe('https://learncorp.example/reset-password?token=a+b%26c');
    });
  });
});

describe('assertRuntimeConfig', () => {
  const production = { NODE_ENV: 'production', CLIENT_URL: 'https://learncorp.example', EMAIL_PROVIDER: 'resend' };

  it('does nothing outside production', () => {
    withEnv({ NODE_ENV: 'development', CLIENT_URL: undefined }, () => expect(() => assertRuntimeConfig()).not.toThrow());
  });
  it('refuses to start production without CLIENT_URL, or with a non-https one', () => {
    withEnv({ ...production, CLIENT_URL: undefined }, () => expect(() => assertRuntimeConfig()).toThrow(/CLIENT_URL is not set/));
    withEnv({ ...production, CLIENT_URL: 'http://learncorp.example' }, () => expect(() => assertRuntimeConfig()).toThrow(/must be https/));
  });
  it('starts with a valid configuration', () => {
    withEnv(production, () => expect(() => assertRuntimeConfig()).not.toThrow());
  });
  it('warns, but starts, when no email provider is configured', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    withEnv({ ...production, EMAIL_PROVIDER: undefined }, () => expect(() => assertRuntimeConfig()).not.toThrow());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('EMAIL_PROVIDER'));
    warn.mockRestore();
  });
});
