import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site-url';

const SITE_URL = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/author/', '/account', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
