import { Award, HeartHandshake, Sparkles, Layers, Globe, ShieldCheck } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

const REASONS = [
  { icon: Award, title: 'Professional Publishing', description: 'Industry-standard editorial and production quality on every title.' },
  { icon: HeartHandshake, title: 'Author Support', description: 'A dedicated contact guides you from submission through launch.' },
  { icon: Sparkles, title: 'Quality Production', description: 'Careful editing, formatting, and design — nothing rushed.' },
  { icon: Layers, title: 'Digital & Print Publishing', description: 'Reach readers in the format they prefer, from day one.' },
  { icon: Globe, title: 'Global Distribution', description: 'Your book, available to readers well beyond your home market.' },
  { icon: ShieldCheck, title: 'Transparent Process', description: 'Clear status updates at every stage — no surprises.' },
];

export default function WhyChooseUs() {
  return (
    <section className="border-b border-rule py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Why authors choose us" title="Built for authors, not just books" />
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <Icon size={22} className="mt-0.5 shrink-0 text-gold" strokeWidth={1.5} />
              <div>
                <h3 className="font-display text-lg text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
