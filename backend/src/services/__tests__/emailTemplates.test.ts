import { verificationEmail, passwordResetEmail, manuscriptStatusEmail, escapeHtml } from '../emailTemplates';

const evil = '<script>alert(1)</script> & "quotes"';

describe('email templates', () => {
  it('escapeHtml neutralises markup', () => {
    expect(escapeHtml(evil)).toBe('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;');
  });

  it('never put user-supplied text into the HTML unescaped', () => {
    const mail = manuscriptStatusEmail({
      name: evil, bookTitle: 'T', headline: 'Changes requested', message: `About ${evil}`, note: `Note ${evil}\nsecond line`, url: 'https://site.test/x',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('second line');
  });

  it('carry the link in both the HTML and the plain-text part', () => {
    const url = 'https://site.test/verify-email?token=abc_DEF-123';
    const mail = verificationEmail({ name: 'Asha Verma', url });
    expect(mail.text).toContain(url);
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text.startsWith('Hi Asha,')).toBe(true);
  });

  it('escape the link so it cannot break out of the attribute', () => {
    const mail = passwordResetEmail({ name: 'A', url: 'https://site.test/r?token=x" onmouseover="alert(1)', minutes: 30 });
    expect(mail.html).not.toContain('" onmouseover="');
    expect(mail.html).toContain('&quot; onmouseover=&quot;');
  });

  it('say how long a reset link lasts', () => {
    expect(passwordResetEmail({ name: 'A', url: 'https://x.test', minutes: 30 }).text).toMatch(/30 minutes/);
  });
});
