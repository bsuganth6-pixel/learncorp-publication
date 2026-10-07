'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';
import { BOOK_CATEGORIES, BOOK_FORMATS, SORT_OPTIONS } from '@/lib/constants';

export default function BookFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    update('search', search);
  };

  return (
    <div className="flex flex-col gap-4 border-b border-rule pb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <form onSubmit={onSearchSubmit} className="relative w-full sm:max-w-xs">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, keyword…"
          className="field-input pl-9"
        />
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          className="field-input w-auto"
          value={searchParams.get('category') || ''}
          onChange={(e) => update('category', e.target.value)}
        >
          <option value="">All categories</option>
          {BOOK_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="field-input w-auto"
          value={searchParams.get('format') || ''}
          onChange={(e) => update('format', e.target.value)}
        >
          <option value="">All formats</option>
          {BOOK_FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          className="field-input w-auto"
          value={searchParams.get('sort') || 'newest'}
          onChange={(e) => update('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
