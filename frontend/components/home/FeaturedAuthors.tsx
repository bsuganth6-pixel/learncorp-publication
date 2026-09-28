import Link from 'next/link';
import Image from 'next/image';
import { getAuthors } from '@/lib/api-client';
import SectionHeading from '@/components/ui/SectionHeading';
import { initials } from '@/lib/utils';

export default async function FeaturedAuthors() {
  const { data: authors } = await getAuthors({ limit: 6 });

  if (authors.length === 0) return null;

  return (
    <section className="border-b border-rule py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Meet the authors" title="Featured Authors" align="center" />
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {authors.map((author) => (
            <Link key={author._id} href={`/authors/${author.slug}`} className="group flex flex-col items-center text-center">
              <span className="relative h-20 w-20 overflow-hidden rounded-full bg-ink/5">
                {author.photoUrl ? (
                  <Image src={author.photoUrl} alt={author.name} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-lg text-ink-soft">
                    {initials(author.name)}
                  </span>
                )}
              </span>
              <span className="mt-3 text-sm font-medium text-ink group-hover:text-gold">{author.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
