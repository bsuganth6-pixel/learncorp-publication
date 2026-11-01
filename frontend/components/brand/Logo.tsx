import Image from 'next/image';
import markSrc from '@/assets/brand/logo-mark.webp';
import lockupSrc from '@/assets/brand/logo-lockup.webp';
import lockupDarkSrc from '@/assets/brand/logo-lockup-dark.webp';

/**
 * Brand images are imported statically and rendered `unoptimized` on purpose.
 * The build emits them to /_next/static/media/<name>.<hash>.webp — the same
 * immutable path the CSS and fonts load from — so they never depend on the
 * /_next/image optimiser or on files in public/. They are already exported at the
 * size each slot needs, so there is nothing for an optimiser to add.
 */
interface LogoProps {
  /** Tailwind classes that size the logo, e.g. "h-9 w-auto". */
  className?: string;
  priority?: boolean;
  /** Leave empty when the brand name is already written next to the logo. */
  alt?: string;
}

/** Globe-and-book symbol only; transparent, works on light and dark backgrounds. */
export function LogoMark({ className, priority, alt = '' }: LogoProps) {
  return <Image src={markSrc} alt={alt} unoptimized priority={priority} className={className} />;
}

/** Full lockup with the wordmark. `onDark` swaps in the light-wordmark version. */
export function LogoLockup({
  className,
  priority,
  alt = 'LearnCorp Publication',
  onDark = false,
}: LogoProps & { onDark?: boolean }) {
  return (
    <Image
      src={onDark ? lockupDarkSrc : lockupSrc}
      alt={alt}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
