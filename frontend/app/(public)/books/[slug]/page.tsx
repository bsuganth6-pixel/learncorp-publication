import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, ShoppingCart, Calendar, Layers, Globe2, Building2, Hash } from 'lucide-react';
import { getBookBySlug, getBooks } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import BookCard from '@/components/ui/BookCard';

export const revalidate = 120;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data: books } = await getBooks({ limit: 20 });
  return books.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getBookBySlug(params.slug);
  if (!result) return { title: 'Book not found' };
  const { data: book } = result;
  return {
    title: book.title,
    description: book.description.slice(0, 155),
    openGraph: { title: book.title, description: book.description.slice(0, 155), images: [book.coverImageUrl] },
  };
}

export default async function BookDetailsPage({ params }: { params: { slug: string } }) {
  const result = await getBookBySlug(params.slug);
  if (!result) notFound();
  const { data: book, related } = result;

  const metaRows = [
    { icon: Hash, label: 'ISBN', value: book.isbn },
    { icon: Calendar, label: 'Published', value: book.publicationDate ? formatDate(book.publicationDate) : '—' },
    { icon: Layers, label: 'Pages', value: book.pages ?? '—' },
    { icon: Globe2, label: 'Language', value: book.language },
    { icon: Building2, label: 'Publisher', value: book.publisher },
  ];

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[380px_1fr] lg:gap-14">
        <div>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-rule bg-ink/5 shadow-card">
            <Image src={book.coverImageUrl} alt={`Cover of ${book.title}`} fill className="object-cover" priority />
          </div>
        </div>

        <div>
          <p className="section-label">{book.category} · {book.format}</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">{book.title}</h1>
          <p className="mt-2 text-base text-ink-soft">
            by{' '}
            {book.authors.map((a, i) => (
              <span key={a._id}>
                <Link href={`/authors/${a.slug}`} className="font-medium text-ink hover:text-gold">{a.name}</Link>
                {i < book.authors.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>

          {book.reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(book.ratingsAvg) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="text-sm text-ink-soft">{book.ratingsAvg.toFixed(1)} ({book.reviews.length} reviews)</span>
            </div>
          )}

          <p className="mt-6 font-display text-3xl text-ink">{formatPrice(book.price)}</p>
          <button type="button" className="btn-gold mt-4 w-full sm:w-auto">
            <ShoppingCart size={16} /> Buy / Order Now
          </button>
          <p className="mt-2 text-xs text-ink-soft">
            Submits a purchase inquiry — our team will follow up with ordering &amp; shipping details.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-6 sm:grid-cols-3">
            {metaRows.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-soft">
                  <Icon size={13} /> {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-16 grid gap-14 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-12">
          <section>
            <h2 className="font-display text-2xl text-ink">Description</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{book.description}</p>
          </section>

          {book.tableOfContents && (
            <section>
              <h2 className="font-display text-2xl text-ink">Table of Contents</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{book.tableOfContents}</p>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl text-ink">Reviews</h2>
            {book.reviews.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">No reviews yet.</p>
            ) : (
              <div className="mt-6 space-y-6">
                {book.reviews.map((review, i) => (
                  <div key={i} className="border-b border-rule pb-6 last:border-none">
                    <div className="flex items-center gap-2">
                      <div className="flex text-gold">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} size={13} fill={s < review.rating ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-ink">{review.name}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          {book.authors.map((a) => (
            <div key={a._id} className="rounded-sm border border-rule p-5">
              <p className="section-label">About the Author</p>
              <Link href={`/authors/${a.slug}`} className="mt-2 block font-display text-lg text-ink hover:text-gold">
                {a.name}
              </Link>
            </div>
          ))}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-rule pt-12">
          <h2 className="font-display text-2xl text-ink">Related Books</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            {related.map((b) => (
              <BookCard key={b._id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
