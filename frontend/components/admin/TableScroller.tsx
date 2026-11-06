/**
 * Wrapper for a wide table. On a phone the table scrolls sideways inside this box rather than the page, and
 * the box itself is keyboard-focusable (and named) so people who can't use a mouse or touch can scroll it.
 */
export default function TableScroller({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-sm border border-rule bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {children}
    </div>
  );
}
