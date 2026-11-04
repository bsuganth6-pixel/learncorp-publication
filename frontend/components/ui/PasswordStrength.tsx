import { Check, Circle } from 'lucide-react';
import { passwordChecks, passwordStrength, STRENGTH_LABEL } from '@/lib/password';
import { cn } from '@/lib/utils';

const SEGMENT_COLOUR = ['', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'] as const;

/** Live feedback while choosing a password: a four-step meter plus the rules still to meet. */
export default function PasswordStrength({ value }: { value: string }) {
  const level = passwordStrength(value);
  const checks = passwordChecks(value);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className={cn('h-1 flex-1 rounded-full', level >= step ? SEGMENT_COLOUR[level] : 'bg-rule')} />
          ))}
        </div>
        <span className="min-w-[5.5rem] text-right text-xs text-ink-soft" aria-live="polite">
          {STRENGTH_LABEL[level]}
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {checks.map((check) => (
          <li key={check.id} className={cn('flex items-center gap-1.5', check.ok ? 'text-success' : 'text-ink-soft')}>
            {check.ok ? <Check size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
            <span>{check.label}</span>
            <span className="sr-only">{check.ok ? '(met)' : '(not met yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
