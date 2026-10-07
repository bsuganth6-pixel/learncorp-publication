import { Quote } from 'lucide-react';
import { getTestimonials } from '@/lib/api-client';
import SectionHeading from '@/components/ui/SectionHeading';
import { initials } from '@/lib/utils';

export default async function Testimonials() {
  const { data: testimonials } = await getTestimonials();

  if (testimonials.length === 0) return null;

  return (
    <section className="border-b border-rule bg-surface py-20">
      <div className="container-page">
        <SectionHeading eyebrow="From our authors" title="What authors say" align="center" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((t) => (
            <figure key={t._id} className="rounded-sm border border-rule p-6">
              <Quote size={18} className="text-gold" />
              <blockquote className="mt-3 text-sm leading-relaxed text-ink-soft">
                &ldquo;{t.message}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-xs font-medium text-ink">
                  {initials(t.name)}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{t.name}</span>
                  {t.designation && <span className="block text-xs text-ink-soft">{t.designation}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
