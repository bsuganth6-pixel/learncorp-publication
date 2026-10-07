import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBooks } from '@/lib/api-client';
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
  searchParams: Record<string, string | undefined>;
}

export default async function BooksPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const { data: books, pagination } = await getBooks({
    page,
    limit: 12,
    category: searchParams.category,
    format: searchParams.format,
    search: searchParams.search,
    sort: searchParams.sort,
  });

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="The catalogue" title="Books" description="Browse every title we've helped bring into the world." />

      <div className="mt-8">
        <Suspense fallback={<div className="h-24" />}>
          <BookFilters />
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
