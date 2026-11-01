'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPagerProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

/** Previous/next controls for the admin lists, which keep their page in component state. */
export default function AdminPager({ page, pages, onChange }: AdminPagerProps) {
  if (pages <= 1) return null;

  const button =
    'flex h-9 w-9 items-center justify-center rounded-sm border border-rule text-ink hover:border-ink disabled:opacity-30 disabled:hover:border-rule';

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className={button}>
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span className="text-sm text-ink-soft" aria-live="polite">
        Page {page} of {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" className={button}>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
