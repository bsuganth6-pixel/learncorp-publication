import nodemailer, { Transporter } from 'nodemailer';
import { isProduction } from '../config/auth';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

type Provider = 'smtp' | 'resend' | 'console';

/**
 * EMAIL_PROVIDER = smtp | resend | console.
 * `console` just prints the message and exists for local development; in production it counts as
 * "not configured", because printing a password-reset link to a log is not delivering it.
 */
function activeProvider(): Provider | null {
  const configured = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (configured === 'smtp' || configured === 'resend') return configured;
  if (isProduction()) return null;
  return 'console';
}

export const isEmailEnabled = (): boolean => activeProvider() !== null;

/** Messages "sent" while NODE_ENV=test, so tests can read the links that real users would receive. */
const testOutbox: EmailMessage[] = [];
export const getTestOutbox = (): readonly EmailMessage[] => testOutbox;
export const clearTestOutbox = (): void => {
  testOutbox.length = 0;
};

let smtpTransport: Transporter | undefined;
function smtp(): Transporter {
  smtpTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return smtpTransport;
}

const fromAddress = (): string => process.env.EMAIL_FROM || 'LearnCorp Publication <no-reply@localhost>';

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('No email provider is configured (set EMAIL_PROVIDER, EMAIL_FROM and the provider credentials).');
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = activeProvider();
  if (!provider) throw new EmailNotConfiguredError();

  if (provider === 'console') {
    if (process.env.NODE_ENV === 'test') {
      testOutbox.push(message);
    } else {
      console.log(`\n[email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    }
    return;
  }

  if (provider === 'smtp') {
    await smtp().sendMail({ from: fromAddress(), ...message });
    return;
  }

  // Resend's HTTP API: unlike SMTP it also works on hosts that block outbound mail ports.
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    signal: AbortSignal.timeout(15_000),
  });
  // Status only: the response body can echo recipient details we don't want in logs.
  if (!response.ok) throw new Error(`Resend rejected the message (HTTP ${response.status})`);
}
