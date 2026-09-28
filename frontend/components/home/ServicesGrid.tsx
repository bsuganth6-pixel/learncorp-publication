import {
  BookMarked, Hash, PenTool, CheckCircle2, LayoutTemplate, Palette, Printer, Globe2, Users,
} from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

export const SERVICES = [
  { icon: BookMarked, title: 'Book Publishing', description: 'End-to-end publishing from manuscript to finished book.' },
  { icon: Hash, title: 'ISBN Assistance', description: 'ISBN registration and publication metadata handled for you.' },
  { icon: PenTool, title: 'Book Editing', description: 'Professional language and content editing by genre specialists.' },
  { icon: CheckCircle2, title: 'Proofreading', description: 'Final grammar, spelling, and formatting checks before print.' },
  { icon: LayoutTemplate, title: 'Book Formatting', description: 'Interior formatting for paperback, hardcover, and eBook.' },
  { icon: Palette, title: 'Cover Design', description: 'Front, back, and spine design that fits your genre and audience.' },
  { icon: Printer, title: 'Printing Assistance', description: 'Guidance and vendor coordination for physical print runs.' },
  { icon: Globe2, title: 'Digital Publishing', description: 'eBook conversion and distribution to major digital storefronts.' },
  { icon: Users, title: 'Author Support', description: 'A dedicated point of contact from submission to release.' },
];

export default function ServicesGrid() {
  return (
    <section className="border-b border-rule bg-surface py-20">
      <div className="container-page">
        <SectionHeading eyebrow="What we offer" title="Publishing Services" align="center" />
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-sm border border-rule bg-rule sm:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-surface p-7">
              <Icon size={22} className="text-gold" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
