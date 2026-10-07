'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown, Search } from 'lucide-react';
import { BOOK_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/authors', label: 'Authors' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setBooksOpen(false);
  }, [pathname]);

  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="bg-ink py-2 text-center text-xs font-medium tracking-wide text-paper/80">
        New titles added every month — <Link href="/publish" className="text-gold-light underline underline-offset-2">authors, submit your manuscript</Link>
      </div>

      <div className="border-b border-rule bg-paper/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-6 sm:h-20">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="relative h-9 w-9 overflow-hidden rounded-sm sm:h-10 sm:w-10">
              <Image src="/logo.png" alt="LearnCorp Publication" fill className="object-contain" priority />
            </span>
            <span className="font-display text-lg font-medium leading-none text-ink sm:text-xl">
              LearnCorp <span className="text-gold">Publication</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setBooksOpen(true)}
              onMouseLeave={() => setBooksOpen(false)}
            >
              <Link
                href="/books"
                className="flex items-center gap-1 font-sans text-sm font-medium text-ink-soft hover:text-ink"
              >
                Shop by Category <ChevronDown size={14} />
              </Link>
              {booksOpen && (
                <div className="absolute left-1/2 top-full w-[560px] -translate-x-1/2 pt-3">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-2 rounded-sm border border-rule bg-surface p-6 shadow-lg">
                    {BOOK_CATEGORIES.map((c) => (
                      <Link
                        key={c}
                        href={`/books?category=${encodeURIComponent(c)}`}
                        className="rounded-sm px-2 py-1.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
                      >
                        {c}
                      </Link>
                    ))}
                    <Link
                      href="/books"
                      className="col-span-3 mt-2 border-t border-rule pt-3 text-sm font-medium text-gold hover:underline"
                    >
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
                className={cn(
                  'font-sans text-sm font-medium text-ink-soft transition-colors hover:text-ink',
                  pathname === link.href && 'text-ink'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <Link href="/books" aria-label="Search books" className="text-ink-soft hover:text-ink">
              <Search size={18} />
            </Link>
            <Link href="/contact" className="btn-outline text-sm">Contact</Link>
            <Link href="/publish" className="btn-gold text-sm">Publish Your Book</Link>
          </div>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-rule bg-paper lg:hidden">
            <div className="container-page flex flex-col gap-1 py-4">
              <p className="section-label px-2 pt-1">Shop by Category</p>
              <div className="grid grid-cols-2 gap-1">
                {BOOK_CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    href={`/books?category=${encodeURIComponent(c)}`}
                    className="rounded-sm px-2 py-2 text-sm text-ink-soft hover:bg-ink/5"
                  >
                    {c}
                  </Link>
                ))}
              </div>
              <div className="my-2 border-t border-rule" />
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-sm px-2 py-2.5 font-sans text-sm font-medium text-ink hover:bg-ink/5"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/publish" className="btn-gold mt-2 justify-center text-sm">
                Publish Your Book
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
