export default function Loading() {
  return (
    <div className="container-page py-12 sm:py-16" aria-busy="true" aria-label="Loading authors">
      <div className="mx-auto h-8 w-40 animate-pulse rounded-sm bg-ink/10" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 rounded-sm border border-rule p-6">
            <div className="h-24 w-24 animate-pulse rounded-full bg-ink/10" />
            <div className="h-4 w-24 animate-pulse rounded bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
