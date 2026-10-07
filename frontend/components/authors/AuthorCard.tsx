import Link from 'next/link';
import Image from 'next/image';
import type { Author } from '@/lib/types';
import { initials } from '@/lib/utils';

export default function AuthorCard({ author }: { author: Author }) {
  return (
    <Link
      href={`/authors/${author.slug}`}
      className="group flex flex-col items-center rounded-sm border border-rule bg-surface p-6 text-center shadow-card transition-shadow hover:shadow-lg"
    >
      <span className="relative h-24 w-24 overflow-hidden rounded-full bg-ink/5">
        {author.photoUrl ? (
          <Image src={author.photoUrl} alt={author.name} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-xl text-ink-soft">
            {initials(author.name)}
          </span>
        )}
      </span>
      <h3 className="mt-4 font-display text-lg text-ink group-hover:text-gold">{author.name}</h3>
      {author.bio && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{author.bio}</p>}
    </Link>
  );
}
