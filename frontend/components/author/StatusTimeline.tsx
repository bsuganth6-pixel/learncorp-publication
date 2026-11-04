import { formatDate } from '@/lib/utils';
import type { SubmissionEvent } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

/** Newest first. Notes from the editors are shown in full, because that's the point of the page. */
export default function StatusTimeline({ events }: { events: SubmissionEvent[] }) {
  const ordered = [...events].reverse();
  return (
    <ol className="relative space-y-6 border-l border-rule pl-6">
      {ordered.map((event, i) => (
        <li key={`${event.at}-${i}`} className="relative">
          <span className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-gold" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={event.status} />
            <span className="text-xs text-ink-soft">{event.by} · {formatDate(event.at)}</span>
          </div>
          {event.note && <p className="mt-2 whitespace-pre-line rounded-sm bg-ink/5 px-4 py-3 text-sm leading-relaxed text-ink">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
