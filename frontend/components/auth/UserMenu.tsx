'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, FileText, LayoutDashboard, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/roles';
import { initials } from '@/lib/utils';
import type { AuthUser } from '@/lib/types';

function menuItems(user: AuthUser) {
  if (isAdminRole(user.role)) {
    return [
      { href: '/admin/dashboard', label: 'Admin dashboard', icon: LayoutDashboard },
      { href: '/account', label: 'Account & security', icon: UserCog },
    ];
  }
  return [
    { href: '/author/dashboard', label: 'Author dashboard', icon: LayoutDashboard },
    { href: '/author/submissions', label: 'My submissions', icon: FileText },
    { href: '/author/notifications', label: 'Notifications', icon: Bell, badge: user.unreadNotifications ?? 0 },
    { href: '/account', label: 'Account & security', icon: UserCog },
  ];
}

/** Avatar button + dropdown for a signed-in account (desktop header). */
export default function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  const unread = user.unreadNotifications ?? 0;

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}${unread ? `, ${unread} unread notifications` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-ink hover:bg-ink/5"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
          {initials(user.name)}
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-paper bg-gold" aria-hidden="true" />}
        </span>
        <ChevronDown size={14} aria-hidden="true" className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-sm border border-rule bg-surface py-2 shadow-lg">
          <div className="border-b border-rule px-4 pb-3 pt-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
            {user.role === 'author' && !user.emailVerified && (
              <p className="mt-2 inline-flex rounded-sm bg-warning/15 px-2 py-0.5 text-xs font-medium text-ink">Email not confirmed</p>
            )}
          </div>
          <div className="py-1">
            {menuItems(user).map(({ href, label, icon: Icon, ...rest }) => (
              <Link key={href} href={href} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ink/5">
                <Icon size={16} className="text-ink-soft" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {'badge' in rest && rest.badge ? <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-medium text-white">{rest.badge}</span> : null}
              </Link>
            ))}
          </div>
          <div className="border-t border-rule pt-1">
            <button type="button" role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-ink/5">
              <LogOut size={16} className="text-ink-soft" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
