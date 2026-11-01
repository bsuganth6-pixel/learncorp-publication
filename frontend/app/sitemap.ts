import type { MetadataRoute } from 'next';
import { getBooks, getAuthors } from '@/lib/api-client';
import { getSiteUrl } from '@/lib/site-url';
import { fetchAllPages } from '@/lib/paginate';

// The API's maximum page size.
const PAGE_SIZE = 50;

const SITE_URL = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '', '/books', '/authors', '/services', '/publish', '/contact', '/about', '/faq',
  ].map((path) => ({ url: `${SITE_URL}${path}`, lastModified: new Date() }));

  const [books, authors] = await Promise.all([
    fetchAllPages((page) => getBooks({ page, limit: PAGE_SIZE })),
    fetchAllPages((page) => getAuthors({ page, limit: PAGE_SIZE })),
  ]);

  const bookRoutes = books.map((b) => ({
    url: `${SITE_URL}/books/${b.slug}`,
    lastModified: new Date(b.createdAt),
  }));
  const authorRoutes = authors.map((a) => ({
    url: `${SITE_URL}/authors/${a.slug}`,
    lastModified: new Date(a.createdAt),
  }));

  return [...staticRoutes, ...bookRoutes, ...authorRoutes];
}
