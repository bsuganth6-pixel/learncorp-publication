'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, FileText, Mail, Quote, LogOut, Menu, X, UserCog, ScrollText, UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { AuthUser } from '@/lib/types';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/dashboard/manuscripts', label: 'Manuscripts', icon: FileText },
  { href: '/admin/dashboard/books', label: 'Books', icon: BookOpen },
  { href: '/admin/dashboard/authors', label: 'Authors', icon: Users },
  { href: '/admin/dashboard/users', label: 'Accounts', icon: UsersRound },
  { href: '/admin/dashboard/messages', label: 'Messages', icon: Mail },
  { href: '/admin/dashboard/testimonials', label: 'Testimonials', icon: Quote },
  { href: '/admin/dashboard/activity', label: 'Activity log', icon: ScrollText },
];

export default function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await signOut(); // ends the session on the server, then clears the browser state
    router.replace('/admin/login');
    router.refresh();
  };

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <LogoMark className="h-7 w-auto" />
        <span className="font-display text-base text-paper">Admin Dashboard</span>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-gold/15 text-gold-light' : 'text-paper/70 hover:bg-paper/5 hover:text-paper'
              )}
            >
              <Icon size={17} aria-hidden="true" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 mt-3 border-t border-paper/10 pt-3">
        <div className="px-3 pb-2">
          <p className="truncate text-sm font-medium text-paper">{user.name}</p>
          <p className="truncate text-xs text-paper/60">{user.role === 'superadmin' ? 'Super admin' : 'Administrator'}</p>
        </div>
        <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-paper/70 hover:bg-paper/5 hover:text-paper">
          <UserCog size={17} aria-hidden="true" /> Account &amp; security
        </Link>
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-paper/70 hover:bg-paper/5 hover:text-paper">
          <LogOut size={17} aria-hidden="true" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink lg:flex">{content}</aside>

      <div className="flex items-center justify-between border-b border-rule bg-ink px-4 py-3 lg:hidden">
        <span className="font-display text-base text-paper">Admin Dashboard</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center text-paper" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      {open && <aside className="flex max-h-[80vh] flex-col overflow-y-auto bg-ink pb-2 lg:hidden">{content}</aside>}
    </>
  );
}
