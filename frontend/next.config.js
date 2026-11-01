const { PHASE_PRODUCTION_BUILD } = require('next/constants');

/**
 * The browser only ever talks to this app's own origin; /api/* is proxied to
 * the real API (below). That keeps the httpOnly session cookie first-party:
 * with the API on a different site (e.g. *.vercel.app -> *.onrender.com) a
 * SameSite=Strict cookie would never be sent, and this app's middleware
 * (which looks for that cookie) could never see it.
 *
 * API_ORIGIN is read at BUILD time (rewrites are baked into the routes manifest),
 * so changing it on the host requires a redeploy.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
module.exports = (phase) => {
  if (!process.env.API_ORIGIN && phase === PHASE_PRODUCTION_BUILD) {
    // Fail the build rather than ship a site whose /api/* (and admin login) 404s.
    throw new Error(
      [
        'API_ORIGIN is not set.',
        "Set it to your API's origin (no trailing slash, no /api), e.g. https://learncorp-api.onrender.com,",
        'for the Production AND Preview environments in the Vercel project settings, then redeploy.',
        'See docs/DEPLOYMENT.md.',
      ].join(' ')
    );
  }
  const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:5000').replace(/\/$/, '');

  return {
    images: {
      // Cloudinary resizes/re-encodes on its own CDN (lib/image-loader.ts); nothing is
      // routed through the host's /_next/image optimiser. Brand images are static imports.
      loader: 'custom',
      loaderFile: './lib/image-loader.ts',
    },
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
    },
  };
};
