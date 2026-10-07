'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, FileText, Mail, Quote, LogOut, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { logout } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/dashboard/books', label: 'Books', icon: BookOpen },
  { href: '/admin/dashboard/authors', label: 'Authors', icon: Users },
  { href: '/admin/dashboard/manuscripts', label: 'Manuscripts', icon: FileText },
  { href: '/admin/dashboard/messages', label: 'Messages', icon: Mail },
  { href: '/admin/dashboard/testimonials', label: 'Testimonials', icon: Quote },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    router.replace('/admin/login');
    router.refresh();
  };

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="relative h-8 w-8 overflow-hidden rounded-sm">
          <Image src="/logo.png" alt="" fill className="object-contain" />
        </span>
        <span className="font-display text-base text-paper">Admin Dashboard</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-gold/15 text-gold-light' : 'text-paper/70 hover:bg-paper/5 hover:text-paper'
              )}
            >
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mx-3 mb-5 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-paper/70 hover:bg-paper/5 hover:text-paper"
      >
        <LogOut size={17} /> Log Out
      </button>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink lg:flex">{content}</aside>

      <div className="flex items-center justify-between border-b border-rule bg-ink px-4 py-3 lg:hidden">
        <span className="font-display text-base text-paper">Admin Dashboard</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-paper" aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && <aside className="flex flex-col bg-ink pb-4 lg:hidden">{content}</aside>}
    </>
  );
}
