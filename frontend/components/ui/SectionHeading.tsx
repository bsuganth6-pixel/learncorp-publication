import { cn } from '@/lib/utils';

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  light?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="section-label">{eyebrow}</p>}
      <h2
        className={cn(
          'mt-2 font-display text-3xl leading-tight sm:text-4xl',
          light ? 'text-paper' : 'text-ink'
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn('mt-3 text-base leading-relaxed', light ? 'text-paper/70' : 'text-ink-soft')}>
          {description}
        </p>
      )}
    </div>
  );
}
