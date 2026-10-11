import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBooks, getAuthors } from '@/lib/api-client';
import { normalizeBookQuery } from '@/lib/book-query';
import BookCard from '@/components/ui/BookCard';
import BookFilters from '@/components/books/BookFilters';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'Books Catalogue',
  description: 'Browse published titles from LearnCorp Publication across every genre and format.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BooksPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const [{ data: books, pagination }, authors] = await Promise.all([
    getBooks({ ...normalizeBookQuery(searchParams), limit: 12 }),
    getAuthors({ limit: 50 }),
  ]);

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="The catalogue" title="Books" description="Browse every title we've helped bring into the world." />

      <div className="mt-8">
        <Suspense fallback={<div className="h-24" />}>
          <BookFilters authors={authors.data.map((a) => ({ _id: a._id, name: a.name }))} />
        </Suspense>
      </div>

      {books.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No books match those filters" description="Try a different category, format, or search term." />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination page={pagination.page} pages={pagination.pages} />
      </Suspense>
    </div>
  );
}
