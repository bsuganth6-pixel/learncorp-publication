'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, FormEvent, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { BOOK_CATEGORIES, BOOK_FORMATS, SORT_OPTIONS } from '@/lib/constants';

const FILTER_KEYS = ['search', 'category', 'author', 'format', 'year', 'minPrice', 'maxPrice', 'sort'];

export default function BookFilters({ authors }: { authors: { _id: string; name: string }[] }) {
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

  // Numeric fields apply on blur or Enter (not per keystroke, which would reload the list constantly).
  const numeric = (key: string, label: string, placeholder: string, extra: { min: number; max?: number }) => (
    <input
      key={`${key}-${searchParams.get(key) ?? ''}`}
      type="number"
      inputMode="numeric"
      {...extra}
      defaultValue={searchParams.get(key) || ''}
      aria-label={label}
      placeholder={placeholder}
      className="field-input w-28"
      onBlur={(e) => { if (e.target.value !== (searchParams.get(key) || '')) update(key, e.target.value); }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') update(key, e.currentTarget.value); }}
    />
  );

  const active = FILTER_KEYS.some((k) => searchParams.get(k));

  return (
    <div className="flex flex-col gap-4 border-b border-rule pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <form onSubmit={onSearchSubmit} role="search" className="relative w-full sm:max-w-xs">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, author, ISBN, keyword…"
            aria-label="Search books by title, author, ISBN or keyword"
            className="field-input pl-9"
          />
        </form>

        <div className="flex flex-wrap gap-3">
          <select className="field-input w-auto" value={searchParams.get('category') || ''} onChange={(e) => update('category', e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="field-input w-auto" value={searchParams.get('author') || ''} onChange={(e) => update('author', e.target.value)} aria-label="Filter by author">
            <option value="">All authors</option>
            {authors.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <select className="field-input w-auto" value={searchParams.get('format') || ''} onChange={(e) => update('format', e.target.value)} aria-label="Filter by format">
            <option value="">All formats</option>
            {BOOK_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="field-input w-auto" value={searchParams.get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)} aria-label="Sort books">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {numeric('year', 'Publication year', 'Year', { min: 1000, max: 3000 })}
        {numeric('minPrice', 'Minimum price', 'Min ₹', { min: 0 })}
        {numeric('maxPrice', 'Maximum price', 'Max ₹', { min: 0 })}
        {active && (
          <button type="button" onClick={() => { setSearch(''); router.push(pathname); }} className="text-sm font-medium text-gold hover:underline">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
