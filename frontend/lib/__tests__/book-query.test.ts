import { describe, it, expect } from 'vitest';
import { normalizeBookQuery } from '../book-query';

describe('normalizeBookQuery (URL params are untrusted)', () => {
  it('passes valid values through', () => {
    expect(normalizeBookQuery({ page: '3', category: 'Fiction', author: '0123456789abcdef01234567', format: 'eBook', search: ' orchard ', sort: 'price-asc', minPrice: '100', maxPrice: '500', year: '2024' }))
      .toEqual({ page: 3, category: 'Fiction', author: '0123456789abcdef01234567', format: 'eBook', search: 'orchard', sort: 'price-asc', minPrice: 100, maxPrice: 500, year: 2024 });
  });

  it('drops every invalid value instead of forwarding it (which would 400 and show an error page)', () => {
    const q = normalizeBookQuery({ page: '0', author: 'abc', format: 'Scroll', sort: 'password', minPrice: '-5', maxPrice: 'lots', year: 'zzz' });
    expect(q).toEqual({ page: 1, category: undefined, author: undefined, format: undefined, search: undefined, sort: undefined, minPrice: undefined, maxPrice: undefined, year: undefined });
  });

  it('caps over-long free text and ignores empty strings', () => {
    expect(normalizeBookQuery({ search: 'x'.repeat(500) }).search).toHaveLength(100);
    expect(normalizeBookQuery({ search: '   ', category: '' })).toMatchObject({ search: undefined, category: undefined });
  });
});
