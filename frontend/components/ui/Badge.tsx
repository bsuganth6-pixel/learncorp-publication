import { cn } from '@/lib/utils';

// Coloured text on a tinted background fails WCAG contrast for the success and warning colours, so those tones keep
// ink text and carry the colour in a dot instead (the same approach as StatusBadge).
const TONES = {
  neutral: { box: 'bg-ink/5 text-ink-soft', dot: '' },
  gold: { box: 'bg-gold/10 text-gold-dark', dot: '' },
  success: { box: 'bg-success/10 text-ink', dot: 'bg-success' },
  danger: { box: 'bg-danger/10 text-ink', dot: 'bg-danger' },
  warning: { box: 'bg-warning/15 text-ink', dot: 'bg-warning' },
} as const;

export default function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  const { box, dot } = TONES[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium', box)}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}
