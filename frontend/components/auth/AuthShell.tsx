import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { LogoLockup, LogoMark } from '@/components/brand/Logo';

const BENEFITS = [
  'Submit your manuscript and cover over a secure connection',
  'Follow every submission from review to publication',
  'Read the editors’ feedback and resubmit when changes are requested',
];

/**
 * Frame for every sign-in / sign-up screen. Wide screens get the brand panel beside the form;
 * phones get a compact header above it. These pages have no site header or footer (see ChromeGate)
 * so there is nothing to distract from the task.
 */
export default function AuthShell({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between bg-ink px-12 py-12 text-paper lg:flex xl:px-16">
        <Link href="/" aria-label="LearnCorp Publication home">
          <LogoLockup onDark className="h-11 w-auto" />
        </Link>

        <div className="max-w-md">
          <span className="block h-px w-12 bg-gold-light" aria-hidden="true" />
          <p className="mt-6 font-display text-4xl leading-[1.15]">Your story, from first draft to finished book.</p>
          <ul className="mt-10 space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm leading-relaxed text-paper/80">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold-light" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-paper/60">© {new Date().getFullYear()} LearnCorp Publication</p>
      </aside>

      <div className="flex min-h-screen flex-col bg-paper">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="LearnCorp Publication home">
            <LogoMark className="h-8 w-auto" />
            <span className="font-display text-base text-ink">LearnCorp <span className="text-gold">Publication</span></span>
          </Link>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink">← Back to site</Link>
        </div>

        {/* The root layout already provides the <main> landmark and skip-link target. */}
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-rule pt-6 text-sm text-ink-soft">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
