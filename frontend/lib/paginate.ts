import type { Paginated } from '@/lib/types';

/**
 * Collect every page of a paginated API list. The API caps page size at 50, so a
 * catalogue larger than that (e.g. for the sitemap) has to be read page by page.
 * `maxPages` is a safety cap, not a target.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  maxPages = 100
): Promise<T[]> {
  const first = await fetchPage(1);
  const remaining = Math.max(0, Math.min(first.pagination.pages, maxPages) - 1);
  const rest = await Promise.all(Array.from({ length: remaining }, (_, i) => fetchPage(i + 2)));
  return [first, ...rest].flatMap((p) => p.data);
}
