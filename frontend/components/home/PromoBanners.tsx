import Link from 'next/link';
import { Library, Users, PenSquare } from 'lucide-react';

const BANNERS = [
  {
    icon: Library,
    title: 'Full Catalogue',
    description: 'Browse every published title across every category.',
    href: '/books',
    cta: 'View Collection',
  },
  {
    icon: Users,
    title: 'Meet Our Authors',
    description: 'The people behind the books — profiles, bios, and full bibliographies.',
    href: '/authors',
    cta: 'See Authors',
  },
  {
    icon: PenSquare,
    title: 'Publish With Us',
    description: 'Have a manuscript ready? Start the submission process today.',
    href: '/publish',
    cta: 'Get Started',
  },
];

export default function PromoBanners() {
  return (
    <section className="border-b border-rule py-14">
      <div className="container-page grid gap-5 sm:grid-cols-3">
        {BANNERS.map(({ icon: Icon, title, description, href, cta }) => (
          <div key={title} className="flex flex-col rounded-sm border border-rule bg-surface p-6">
            <Icon size={22} className="text-gold" strokeWidth={1.5} />
            <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{description}</p>
            <Link href={href} className="mt-4 text-sm font-medium text-gold hover:underline">
              {cta} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
