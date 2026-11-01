import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from '../paginate';

const page = (n: number, pages: number, items: string[]) => ({
  data: items,
  pagination: { page: n, limit: 2, total: 5, pages },
});

describe('fetchAllPages', () => {
  it('reads every page, in order', async () => {
    const fetchPage = vi.fn(async (n: number) => page(n, 3, [`a${n}`, `b${n}`]));
    expect(await fetchAllPages(fetchPage)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('makes a single request when there is one page', async () => {
    const fetchPage = vi.fn(async (n: number) => page(n, 1, ['only']));
    expect(await fetchAllPages(fetchPage)).toEqual(['only']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when the catalogue is empty', async () => {
    const fetchPage = vi.fn(async (n: number) => page(n, 0, []));
    expect(await fetchAllPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('never reads more than maxPages pages', async () => {
    const fetchPage = vi.fn(async (n: number) => page(n, 500, [`p${n}`]));
    expect(await fetchAllPages(fetchPage, 4)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});
