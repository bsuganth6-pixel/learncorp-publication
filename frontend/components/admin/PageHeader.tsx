import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function PageHeader({
  title, description, newHref, newLabel,
}: {
  title: string;
  description?: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {newHref && (
        <Link href={newHref} className="btn-primary text-sm">
          <Plus size={16} /> {newLabel || 'New'}
        </Link>
      )}
    </div>
  );
}
