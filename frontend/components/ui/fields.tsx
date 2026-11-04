'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import PasswordStrength from './PasswordStrength';
import { cn } from '@/lib/utils';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
}

type InputProps = BaseProps & Omit<React.ComponentProps<'input'>, 'className'> & { className?: string };

/** Label, input, hint and error wired together for screen readers (aria-invalid / aria-describedby). */
export function TextField({ label, error, hint, className, id, ...input }: InputProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">{label}</label>
      <input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className="field-input" {...input} />
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p id={`${fieldId}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

type PasswordProps = InputProps & {
  /** Show the strength meter and rule checklist, driven by the current value. */
  strengthOf?: string;
};

export function PasswordField({ label, error, hint, className, id, strengthOf, ...input }: PasswordProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  const [visible, setVisible] = useState(false);
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field-input pr-11')}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft hover:text-ink"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {strengthOf !== undefined && <PasswordStrength value={strengthOf} />}
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p id={`${fieldId}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}
