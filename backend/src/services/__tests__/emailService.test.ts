import { sendEmail, isEmailEnabled, getTestOutbox, clearTestOutbox, EmailNotConfiguredError } from '../emailService';

const message = { to: 'a@example.com', subject: 'Hi', text: 'text', html: '<p>html</p>' };
const withEnv = async (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.entries(vars).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
  try { await fn(); } finally { Object.entries(saved).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v))); }
};

describe('email service', () => {
  beforeEach(clearTestOutbox);

  it('collects messages in an in-memory outbox under test', async () => {
    await sendEmail(message);
    expect(getTestOutbox()).toEqual([message]);
  });

  it('treats the console provider as "not configured" in production, and refuses to send', async () => {
    await withEnv({ NODE_ENV: 'production', EMAIL_PROVIDER: 'console' }, async () => {
      expect(isEmailEnabled()).toBe(false);
      await expect(sendEmail(message)).rejects.toBeInstanceOf(EmailNotConfiguredError);
    });
    expect(getTestOutbox()).toHaveLength(0);
  });

  it('sends through Resend with the API key, and reports only the status on failure', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await withEnv({ NODE_ENV: 'production', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_secret', EMAIL_FROM: 'LearnCorp <no-reply@learncorp.example>' }, async () => {
      fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      await sendEmail(message);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_secret');
      expect(JSON.parse(init.body as string)).toMatchObject({ from: 'LearnCorp <no-reply@learncorp.example>', to: ['a@example.com'], subject: 'Hi' });

      fetchMock.mockResolvedValueOnce(new Response('{"message":"a@example.com is not allowed"}', { status: 422 }));
      const failure = await sendEmail(message).catch((e: Error) => e);
      expect((failure as Error).message).toBe('Resend rejected the message (HTTP 422)');
      expect((failure as Error).message).not.toContain('a@example.com');
    });
    fetchMock.mockRestore();
  });
});
