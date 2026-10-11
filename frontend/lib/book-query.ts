import type { BookQuery } from './api-client';
import { BOOK_FORMATS, SORT_OPTIONS } from './constants';

type Params = Record<string, string | undefined>;

const positive = (v: string | undefined): number | undefined => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * Turns raw ?query params into a query the API will accept. URL params are
 * user-controlled, so anything invalid is dropped (the catalogue then shows its
 * normal listing) instead of being passed through to a 400 -> error page.
 */
export function normalizeBookQuery(sp: Params): BookQuery {
  const page = Math.floor(Number(sp.page));
  const year = Math.floor(Number(sp.year));
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    category: sp.category?.trim().slice(0, 60) || undefined,
    author: sp.author && /^[0-9a-f]{24}$/i.test(sp.author) ? sp.author : undefined,
    format: (BOOK_FORMATS as readonly string[]).includes(sp.format ?? '') ? sp.format : undefined,
    search: sp.search?.trim().slice(0, 100) || undefined,
    sort: SORT_OPTIONS.some((o) => o.value === sp.sort) ? sp.sort : undefined,
    minPrice: positive(sp.minPrice),
    maxPrice: positive(sp.maxPrice),
    year: Number.isFinite(year) && year >= 1000 && year <= 3000 ? year : undefined,
  };
}
