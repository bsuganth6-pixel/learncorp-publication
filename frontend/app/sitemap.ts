import type { MetadataRoute } from 'next';
import { getBooks, getAuthors } from '@/lib/api-client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '', '/books', '/authors', '/services', '/publish', '/contact', '/about', '/faq',
  ].map((path) => ({ url: `${SITE_URL}${path}`, lastModified: new Date() }));

  const [books, authors] = await Promise.all([
    getBooks({ limit: 50 }),
    getAuthors({ limit: 50 }),
  ]);

  const bookRoutes = books.data.map((b) => ({
    url: `${SITE_URL}/books/${b.slug}`,
    lastModified: new Date(b.createdAt),
  }));
  const authorRoutes = authors.data.map((a) => ({
    url: `${SITE_URL}/authors/${a.slug}`,
    lastModified: new Date(a.createdAt),
  }));

  return [...staticRoutes, ...bookRoutes, ...authorRoutes];
}
