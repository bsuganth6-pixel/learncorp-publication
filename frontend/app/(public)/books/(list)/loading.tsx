export default function Loading() {
  return (
    <div className="container-page py-12 sm:py-16" aria-busy="true" aria-label="Loading books">
      <div className="h-8 w-48 animate-pulse rounded-sm bg-ink/10" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded-sm bg-ink/5" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-sm border border-rule">
            <div className="aspect-[3/4] w-full animate-pulse bg-ink/10" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-ink/10" />
              <div className="h-4 w-full animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-24 animate-pulse rounded bg-ink/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
