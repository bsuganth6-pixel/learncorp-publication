import type { ManuscriptStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

// Colour is never the only signal: every status is also spelled out, and text stays ink for contrast.
const STYLE: Record<ManuscriptStatus, { bg: string; dot: string }> = {
  Submitted: { bg: 'bg-ink/5', dot: 'bg-ink-soft' },
  'Under Review': { bg: 'bg-gold/10', dot: 'bg-gold' },
  'Changes Requested': { bg: 'bg-warning/15', dot: 'bg-warning' },
  Accepted: { bg: 'bg-success/10', dot: 'bg-success' },
  Rejected: { bg: 'bg-danger/10', dot: 'bg-danger' },
  Published: { bg: 'bg-success/15', dot: 'bg-success' },
};

export default function StatusBadge({ status, className }: { status: ManuscriptStatus; className?: string }) {
  const style = STYLE[status] ?? STYLE.Submitted;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium text-ink', style.bg, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {status}
    </span>
  );
}
