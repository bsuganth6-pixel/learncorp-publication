import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  error: { box: 'border-danger/40 bg-danger/5', icon: 'text-danger', Icon: AlertCircle, role: 'alert' as const },
  success: { box: 'border-success/40 bg-success/5', icon: 'text-success', Icon: CheckCircle2, role: 'status' as const },
  info: { box: 'border-ink/15 bg-ink/5', icon: 'text-ink-soft', Icon: Info, role: 'status' as const },
  warning: { box: 'border-warning/50 bg-warning/10', icon: 'text-gold-dark', Icon: TriangleAlert, role: 'status' as const },
};

/** Body text stays ink on every tone (contrast); the tone shows in the border, tint and icon. */
export default function Alert({
  tone = 'info', title, children, className,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, icon, Icon, role } = TONES[tone];
  return (
    <div role={role} className={cn('flex gap-3 rounded-sm border px-4 py-3 text-sm text-ink', box, className)}>
      <Icon size={18} className={cn('mt-0.5 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-ink-soft [&_a]:font-medium [&_a]:text-ink [&_a]:underline">{children}</div>}
      </div>
    </div>
  );
}
