'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/author/dashboard', label: 'Dashboard' },
  { href: '/author/submissions', label: 'Submissions' },
  { href: '/author/notifications', label: 'Notifications' },
];

/** Sub-navigation for the author area. The unread count follows the account state in the header. */
export default function AuthorNav() {
  const pathname = usePathname();
  const unread = useAuth().state.user?.unreadNotifications ?? 0;

  return (
    <nav aria-label="Author area" className="border-b border-rule bg-surface">
      <div className="container-page flex gap-1 overflow-x-auto">
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors sm:px-4',
                active ? 'border-gold text-ink' : 'border-transparent text-ink-soft hover:text-ink'
              )}
            >
              {label}
              {href.endsWith('notifications') && unread > 0 && (
                <span className="rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${unread} unread`}>{unread}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
