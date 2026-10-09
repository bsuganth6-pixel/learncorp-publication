const { PHASE_PRODUCTION_BUILD } = require('next/constants');

/**
 * The browser only ever talks to this app's own origin; /api/* is proxied to
 * the real API (below). That keeps the httpOnly session cookie first-party:
 * with the API on a different site (e.g. *.vercel.app -> *.onrender.com) a
 * SameSite=Strict cookie would never be sent, and this app's middleware
 * (which looks for that cookie) could never see it.
 *
 * API_ORIGIN is read at BUILD time (rewrites are baked into the routes manifest).
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
module.exports = (phase) => {
  if (!process.env.API_ORIGIN && phase === PHASE_PRODUCTION_BUILD) {
    // Fail the build rather than ship a site whose /api/* (and admin login) 404s.
    throw new Error(
      "API_ORIGIN is not set. Set it to your API's origin (e.g. https://your-api.onrender.com) before building."
    );
  }
  const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:5000').replace(/\/$/, '');

  return {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
    },
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
    },
  };
};
