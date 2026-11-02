// Fire-and-forget work (emails, audit rows, notifications) that must never delay or fail a request.
// Tracked so tests (and graceful shutdown) can wait for it to settle.
const pending = new Set<Promise<unknown>>();

export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const promise = task()
    .catch((err: unknown) => {
      console.error(`[background] ${label} failed:`, err instanceof Error ? err.message : err);
    })
    .finally(() => pending.delete(promise));
  pending.add(promise);
}

export async function drainBackground(): Promise<void> {
  while (pending.size > 0) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.allSettled([...pending]);
  }
}
