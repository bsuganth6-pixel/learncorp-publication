import type { Metadata } from 'next';
import { getAuthors } from '@/lib/api-client';
import AuthorCard from '@/components/authors/AuthorCard';
import EmptyState from '@/components/ui/EmptyState';
import SectionHeading from '@/components/ui/SectionHeading';
import Pagination from '@/components/ui/Pagination';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Authors',
  description: 'Meet the authors published by LearnCorp Publication.',
};

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const page = Number(searchParams.page) || 1;
  const { data: authors, pagination } = await getAuthors({ page, limit: 12 });

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="The people behind the books" title="Authors" align="center" />

      {authors.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No authors yet" description="Authors will appear here as they're added." />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {authors.map((author) => (
            <AuthorCard key={author._id} author={author} />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination page={pagination.page} pages={pagination.pages} />
      </Suspense>
    </div>
  );
}
