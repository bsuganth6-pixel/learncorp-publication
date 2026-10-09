'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center" role="alert">
      <AlertTriangle size={40} className="text-danger" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="mt-6 font-display text-3xl text-ink">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">
        An unexpected error occurred. You can try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button type="button" onClick={() => reset()} className="btn-primary">Try Again</button>
        <Link href="/" className="btn-outline">Back to Home</Link>
      </div>
    </div>
  );
}
