'use client';

import { usePathname } from 'next/navigation';
import { isChromeless } from '@/lib/chrome';

/** Renders its children (the footer, which stays a server component) except on screens that draw their own frame. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  return isChromeless(usePathname()) ? null : <>{children}</>;
}
