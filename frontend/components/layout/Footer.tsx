import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      { href: '/books', label: 'Books Catalogue' },
      { href: '/authors', label: 'Authors' },
      { href: '/services', label: 'Publishing Services' },
      { href: '/publish', label: 'Publish Your Book' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-ink text-paper/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-paper">
            LearnCorp <span className="text-gold-light">Publication</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/60">
            Your Story. Your Knowledge. Your Book. A platform for authors to transform ideas and
            manuscripts into professionally published books.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="section-label text-gold-light">{col.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-paper/70 hover:text-paper">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="section-label text-gold-light">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-paper/70">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-gold-light" />
              Tiruvallur, Tamil Nadu, India
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="shrink-0 text-gold-light" />
              <a href="mailto:hello@learncorppublication.com" className="hover:text-paper">
                hello@learncorppublication.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-gold-light" />
              <a href="tel:+910000000000" className="hover:text-paper">+91 00000 00000</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-paper/50 sm:flex-row">
          <p>© {new Date().getFullYear()} LearnCorp Publication. All rights reserved.</p>
          <p>Designed & built for authors everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
