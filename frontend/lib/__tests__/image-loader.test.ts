import { describe, expect, it } from 'vitest';
import imageLoader from '../image-loader';

const cloud = 'https://res.cloudinary.com/demo/image/upload';

describe('imageLoader', () => {
  it('asks Cloudinary for a resized, auto-format, auto-quality variant', () => {
    expect(imageLoader({ src: `${cloud}/v1700000000/book-publication/covers/abc.jpg`, width: 640 })).toBe(
      `${cloud}/f_auto,q_auto,c_limit,w_640/v1700000000/book-publication/covers/abc.jpg`
    );
  });

  it('keeps transformations that are already part of the stored URL', () => {
    expect(imageLoader({ src: `${cloud}/c_fill,g_face,w_300/v1/a.png`, width: 256 })).toBe(
      `${cloud}/f_auto,q_auto,c_limit,w_256/c_fill,g_face,w_300/v1/a.png`
    );
  });

  it('leaves non-Cloudinary and static-asset URLs untouched', () => {
    for (const src of [
      '/_next/static/media/logo-mark.1a2b3c.webp',
      'https://example.com/cover.jpg',
      'http://res.cloudinary.com/demo/image/upload/v1/a.jpg', // plain http is never rewritten
      'https://res.cloudinary.com/demo/video/upload/v1/a.mp4',
    ]) {
      expect(imageLoader({ src, width: 640 })).toBe(src);
    }
  });
});
