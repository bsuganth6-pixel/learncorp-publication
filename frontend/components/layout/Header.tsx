'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown, Search, LogOut, FileText, LayoutDashboard, Bell, UserCog } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import UserMenu from '@/components/auth/UserMenu';
import { BOOK_CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/roles';
import { isChromeless } from '@/lib/chrome';
import { cn, initials } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/authors', label: 'Authors' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const booksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setBooksOpen(false);
  }, [pathname]);

  // While the mobile menu is open the page behind it must not scroll, and Escape closes it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus(); // keyboard users land back where they opened it
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Categories menu: closes on outside click or Escape (it also opens on hover for mouse users).
  useEffect(() => {
    if (!booksOpen) return;
    const onPointer = (e: MouseEvent) => booksRef.current && !booksRef.current.contains(e.target as Node) && setBooksOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBooksOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [booksOpen]);

  if (isChromeless(pathname)) return null;

  const user = state.user;
  const admin = user ? isAdminRole(user.role) : false;
  const firstName = user?.name.split(' ')[0];

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  const promo =
    user === null
      ? { text: 'Writing a book?', link: 'Submit your manuscript for editorial review', href: '/publish' }
      : admin
        ? { text: 'Signed in as administrator.', link: 'Open the admin dashboard', href: '/admin/dashboard' }
        : { text: `Welcome back, ${firstName}.`, link: 'Continue to your dashboard', href: '/author/dashboard' };

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="bg-ink py-2 text-center text-xs font-medium tracking-wide text-paper/80">
        {promo.text} <Link href={promo.href} className="text-gold-light underline underline-offset-2">{promo.link}</Link>
      </div>

      <div className="border-b border-rule bg-paper/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-6 sm:h-20">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <LogoMark priority className="h-9 w-auto sm:h-10" />
            <span className="font-display text-lg font-medium leading-none text-ink sm:text-xl">
              LearnCorp <span className="text-gold">Publication</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-6 xl:flex">
            <div ref={booksRef} className="relative" onMouseEnter={() => setBooksOpen(true)} onMouseLeave={() => setBooksOpen(false)}>
              <div className="flex items-center gap-0.5">
                <Link
                  href="/books"
                  className={cn('font-sans text-sm font-medium text-ink-soft transition-colors hover:text-ink', pathname?.startsWith('/books') && 'text-ink')}
                >
                  Books
                </Link>
                <button
                  type="button"
                  aria-label="Browse book categories"
                  aria-expanded={booksOpen}
                  aria-controls="categories-menu"
                  onClick={() => setBooksOpen((v) => !v)}
                  className="flex h-7 w-6 items-center justify-center text-ink-soft hover:text-ink"
                >
                  <ChevronDown size={14} aria-hidden="true" className={booksOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              </div>
              {booksOpen && (
                <div id="categories-menu" className="absolute left-1/2 top-full w-[560px] -translate-x-1/2 pt-3">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-2 rounded-sm border border-rule bg-surface p-6 shadow-lg">
                    {BOOK_CATEGORIES.map((c) => (
                      <Link key={c} href={`/books?category=${encodeURIComponent(c)}`} className="rounded-sm px-2 py-1.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">
                        {c}
                      </Link>
                    ))}
                    <Link href="/books" className="col-span-3 mt-2 border-t border-rule pt-3 text-sm font-medium text-gold hover:underline">
                      View full catalogue →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={cn('font-sans text-sm font-medium text-ink-soft transition-colors hover:text-ink', pathname === link.href && 'text-ink')}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link href="/books" aria-label="Search books" className="text-ink-soft hover:text-ink">
              <Search size={18} aria-hidden="true" />
            </Link>

            {state.status === 'loading' && <span className="h-9 w-40" aria-hidden="true" />}

            {state.status === 'guest' && (
              <>
                <Link href="/login" className="px-2 text-sm font-medium text-ink hover:text-gold">Log in</Link>
                <Link href="/register" className="btn-outline px-5 py-2.5 text-sm">Register</Link>
              </>
            )}

            {state.status === 'authenticated' && <UserMenu user={state.user} />}

            {(state.status !== 'authenticated' || !admin) && (
              <Link href="/publish" className="btn-gold px-5 py-2.5 text-sm">Publish Your Book</Link>
            )}
            {state.status === 'authenticated' && admin && (
              <Link href="/admin/dashboard" className="btn-gold px-5 py-2.5 text-sm">Admin Dashboard</Link>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="flex h-11 w-11 items-center justify-center text-ink xl:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          ref={panelRef}
          className="fixed inset-x-0 bottom-0 top-24 z-40 overflow-y-auto overscroll-contain border-t border-rule bg-paper pb-8 sm:top-28 xl:hidden"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-5">
            {/* Account block first: it is what people open this menu for on a phone. */}
            {state.status === 'authenticated' && user ? (
              <div className="mb-3 rounded-sm border border-rule bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{initials(user.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                  </div>
                </div>
                {user.role === 'author' && !user.emailVerified && (
                  <p className="mt-3 rounded-sm bg-warning/15 px-3 py-2 text-xs text-ink">Confirm your email to submit manuscripts.</p>
                )}
                <div className="mt-3 grid gap-1">
                  {admin ? (
                    <>
                      <MobileLink href="/admin/dashboard" icon={LayoutDashboard}>Admin dashboard</MobileLink>
                      <MobileLink href="/account" icon={UserCog}>Account & security</MobileLink>
                    </>
                  ) : (
                    <>
                      <MobileLink href="/author/dashboard" icon={LayoutDashboard}>Author dashboard</MobileLink>
                      <MobileLink href="/author/submissions" icon={FileText}>My submissions</MobileLink>
                      <MobileLink href="/author/notifications" icon={Bell} badge={user.unreadNotifications}>Notifications</MobileLink>
                      <MobileLink href="/account" icon={UserCog}>Account & security</MobileLink>
                    </>
                  )}
                </div>
              </div>
            ) : (
              state.status === 'guest' && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <Link href="/login" className="btn-outline justify-center text-sm">Log in</Link>
                  <Link href="/register" className="btn-primary justify-center text-sm">Register</Link>
                </div>
              )
            )}

            <MobileLink href="/books">Books</MobileLink>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
                Browse by category
                <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid grid-cols-2 gap-1 pb-2 pl-2">
                {BOOK_CATEGORIES.map((c) => (
                  <Link key={c} href={`/books?category=${encodeURIComponent(c)}`} className="rounded-sm px-2 py-2 text-sm text-ink-soft hover:bg-ink/5">{c}</Link>
                ))}
              </div>
            </details>
            {NAV_LINKS.map((link) => <MobileLink key={link.href} href={link.href}>{link.label}</MobileLink>)}

            {!admin && <Link href="/publish" className="btn-gold mt-3 justify-center text-sm">Publish Your Book</Link>}

            {state.status === 'authenticated' && (
              <button type="button" onClick={onSignOut} className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-rule px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5">
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function MobileLink({
  href, children, icon: Icon, badge,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('flex items-center gap-3 rounded-sm px-2 py-2.5 text-sm font-medium hover:bg-ink/5', active ? 'text-ink' : 'text-ink-soft')}
    >
      {Icon && <Icon size={17} className="text-ink-soft" aria-hidden />}
      <span className="flex-1">{children}</span>
      {badge ? <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-medium text-white">{badge}</span> : null}
    </Link>
  );
}
