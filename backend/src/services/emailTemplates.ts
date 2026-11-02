import type { EmailMessage } from './emailService';

type Content = Pick<EmailMessage, 'subject' | 'text' | 'html'>;

const NAVY = '#141B2E';
const GOLD = '#8A6018';

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface Layout {
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

function layout({ heading, paragraphs, action, footnote }: Layout): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2b3347">${p}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:3px">${escapeHtml(action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5b6478">Button not working? Paste this address into your browser:<br><span style="word-break:break-all">${escapeHtml(action.url)}</span></p>`
    : '';
  const note = footnote ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5b6478">${footnote}</p>` : '';
  return `<!doctype html><html lang="en"><body style="margin:0;background:#F7F6F3;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F6F3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E0D6">
<tr><td style="background:${NAVY};padding:18px 28px;color:#ffffff;font-size:18px;font-family:Georgia,serif">LearnCorp <span style="color:#C99A3F">Publication</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 18px;font-size:21px;color:${NAVY};font-family:Georgia,serif">${escapeHtml(heading)}</h1>${body}${button}${note}</td></tr>
</table></td></tr></table></body></html>`;
}

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'there';

export function verificationEmail(p: { name: string; url: string }): Content {
  const hi = `Hi ${firstName(p.name)},`;
  return {
    subject: 'Confirm your email address',
    text: `${hi}\n\nConfirm your email to start submitting manuscripts to LearnCorp Publication:\n${p.url}\n\nThe link works for 24 hours. If you didn't create an account, you can ignore this email.`,
    html: layout({
      heading: 'Confirm your email address',
      paragraphs: [escapeHtml(hi), 'Confirm your email to start submitting manuscripts to LearnCorp Publication.'],
      action: { label: 'Confirm email', url: p.url },
      footnote: 'The link works for 24 hours. If you didn’t create an account, you can ignore this email.',
    }),
  };
}

export function passwordResetEmail(p: { name: string; url: string; minutes: number }): Content {
  const hi = `Hi ${firstName(p.name)},`;
  return {
    subject: 'Reset your password',
    text: `${hi}\n\nUse this link to choose a new password (valid for ${p.minutes} minutes, one use):\n${p.url}\n\nIf you didn't ask for this, ignore this email — your password stays the same.`,
    html: layout({
      heading: 'Reset your password',
      paragraphs: [escapeHtml(hi), `Use the button below to choose a new password. The link works once and expires in ${p.minutes} minutes.`],
      action: { label: 'Choose a new password', url: p.url },
      footnote: 'If you didn’t ask for this, ignore this email — your password stays the same.',
    }),
  };
}

export function passwordChangedEmail(p: { name: string; supportUrl: string }): Content {
  const hi = `Hi ${firstName(p.name)},`;
  return {
    subject: 'Your password was changed',
    text: `${hi}\n\nThe password for your LearnCorp Publication account was just changed and you were signed out on your other devices.\n\nIf this wasn't you, reset your password right away and contact us: ${p.supportUrl}`,
    html: layout({
      heading: 'Your password was changed',
      paragraphs: [
        escapeHtml(hi),
        'The password for your LearnCorp Publication account was just changed, and you were signed out on your other devices.',
        'If this wasn’t you, reset your password right away and contact us.',
      ],
      action: { label: 'Contact us', url: p.supportUrl },
    }),
  };
}

export function manuscriptStatusEmail(p: { name: string; bookTitle: string; headline: string; message: string; note?: string; url: string }): Content {
  const hi = `Hi ${firstName(p.name)},`;
  const noteText = p.note ? `\n\nNote from the editorial team:\n${p.note}` : '';
  return {
    subject: `${p.headline}: ${p.bookTitle}`,
    text: `${hi}\n\n${p.message}${noteText}\n\nView your submission:\n${p.url}`,
    html: layout({
      heading: p.headline,
      paragraphs: [
        escapeHtml(hi),
        escapeHtml(p.message),
        ...(p.note ? [`<strong>Note from the editorial team</strong><br>${escapeHtml(p.note).replace(/\n/g, '<br>')}`] : []),
      ],
      action: { label: 'View your submission', url: p.url },
    }),
  };
}
