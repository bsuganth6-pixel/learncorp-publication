import type { ImageLoaderProps } from 'next/image';

/**
 * Global loader for next/image (see `images.loaderFile` in next.config.js).
 *
 * Why not the built-in optimiser: it needs the hosting platform's /_next/image
 * endpoint to work, and when that endpoint is misconfigured, rate-limited or
 * unreachable every image on the site breaks at once. Cloudinary already resizes
 * and re-encodes on its own CDN, so we ask it to do that and skip the extra hop.
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<id>.jpg
 *   -> https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_640/v123/<folder>/<id>.jpg
 *
 * f_auto serves AVIF/WebP where the browser supports it, q_auto picks the quality,
 * c_limit never upscales. Anything that is not a Cloudinary delivery URL (other
 * hosts, already-hashed static assets) is returned untouched.
 */
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  const match = CLOUDINARY_UPLOAD.exec(src);
  if (!match) return src;
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
}
