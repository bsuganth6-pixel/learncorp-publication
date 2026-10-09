import Link from 'next/link';
import { BookX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <BookX size={40} className="text-gold" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="mt-6 font-display text-3xl text-ink sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/" className="btn-primary">Back to Home</Link>
        <Link href="/books" className="btn-outline">Browse Books</Link>
      </div>
    </div>
  );
}
