'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pages <= 1) return null;

  const goTo = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(target));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-rule text-ink disabled:opacity-30"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-ink-soft">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => goTo(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-rule text-ink disabled:opacity-30"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
