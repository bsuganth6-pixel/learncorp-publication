import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Globe, Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import { getAuthorBySlug, getAuthors } from '@/lib/api-client';
import BookCard from '@/components/ui/BookCard';
import EmptyState from '@/components/ui/EmptyState';
import { initials } from '@/lib/utils';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data: authors } = await getAuthors({ limit: 20 });
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getAuthorBySlug(params.slug);
  if (!result) return { title: 'Author not found' };
  return { title: result.data.name, description: result.data.bio?.slice(0, 155) };
}

const SOCIAL_ICONS = { website: Globe, twitter: Twitter, linkedin: Linkedin, instagram: Instagram, facebook: Facebook };

export default async function AuthorProfilePage({ params }: { params: { slug: string } }) {
  const result = await getAuthorBySlug(params.slug);
  if (!result) notFound();
  const { data: author, books } = result;

  const socialEntries = Object.entries(author.socialLinks || {}).filter(([, url]) => url);

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="flex flex-col items-center text-center">
        <span className="relative h-32 w-32 overflow-hidden rounded-full bg-ink/5">
          {author.photoUrl ? (
            <Image src={author.photoUrl} alt={author.name} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-3xl text-ink-soft">
              {initials(author.name)}
            </span>
          )}
        </span>
        <h1 className="mt-5 font-display text-3xl text-ink sm:text-4xl">{author.name}</h1>
        {author.qualifications && <p className="mt-1 text-sm text-gold">{author.qualifications}</p>}
        {author.bio && <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">{author.bio}</p>}

        {socialEntries.length > 0 && (
          <div className="mt-5 flex gap-4">
            {socialEntries.map(([key, url]) => {
              const Icon = SOCIAL_ICONS[key as keyof typeof SOCIAL_ICONS] || Globe;
              return (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-gold">
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-16 border-t border-rule pt-12">
        <h2 className="text-center font-display text-2xl text-ink">Published Books</h2>
        {books.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No published books yet" />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
