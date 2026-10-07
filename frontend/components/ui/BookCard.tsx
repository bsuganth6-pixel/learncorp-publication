import Link from 'next/link';
import Image from 'next/image';
import type { Book } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function BookCard({ book }: { book: Book }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-sm border border-rule bg-surface transition-shadow hover:shadow-lg">
      <Link href={`/books/${book.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-ink/5">
        <Image
          src={book.coverImageUrl}
          alt={`Cover of ${book.title}`}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">{book.publisher}</p>
        <Link href={`/books/${book.slug}`}>
          <h3 className="line-clamp-2 font-display text-sm leading-snug text-ink hover:text-gold sm:text-base">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-ink-soft">{book.authors?.map((a) => a.name).join(', ') || 'Unknown author'}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span className="font-display text-base text-ink sm:text-lg">{formatPrice(book.price)}</span>
          <Link
            href={`/books/${book.slug}`}
            className="rounded-sm bg-gold px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white hover:bg-gold-dark sm:text-xs"
          >
            Buy Now
          </Link>
        </div>
      </div>
    </div>
  );
}
