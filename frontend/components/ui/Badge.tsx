import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  neutral: 'bg-ink/5 text-ink-soft',
  gold: 'bg-gold/10 text-gold-dark',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
};

export default function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof STYLES;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium', STYLES[tone])}>
      {children}
    </span>
  );
}
