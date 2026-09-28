import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getBooks } from '@/lib/api-client';
import BookCard from '@/components/ui/BookCard';

export default async function BookShelf({
  title, subtitle, category, viewAllHref,
}: {
  title: string;
  subtitle?: string;
  category?: string;
  viewAllHref: string;
}) {
  const { data: books } = await getBooks({ category, limit: 6, sort: 'newest' });

  if (books.length === 0) return null;

  return (
    <section className="border-b border-rule py-14">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <Link href={viewAllHref} className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-gold">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
}
