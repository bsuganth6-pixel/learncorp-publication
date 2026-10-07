import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClipboardCheck, PenTool, CheckCircle2, LayoutTemplate, Palette, Hash, Printer, Globe2, Truck, ArrowRight,
} from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'Publishing Services',
  description: 'Manuscript evaluation, editing, proofreading, formatting, cover design, ISBN, printing, digital publishing, and distribution.',
};

const SERVICES = [
  { icon: ClipboardCheck, title: 'Manuscript Evaluation', description: 'Initial evaluation of submitted manuscripts for fit, readiness, and next steps.' },
  { icon: PenTool, title: 'Editing', description: 'Professional language and content editing tailored to your genre.' },
  { icon: CheckCircle2, title: 'Proofreading', description: 'Final grammar, spelling, and formatting checks before anything goes to print.' },
  { icon: LayoutTemplate, title: 'Book Formatting', description: 'Professional interior formatting for paperback, hardcover, Kindle/eBook, and PDF.' },
  { icon: Palette, title: 'Cover Design', description: 'Professional front, back, and spine design built around your book and audience.' },
  { icon: Hash, title: 'ISBN Assistance', description: 'Support for ISBN registration and publication metadata.' },
  { icon: Printer, title: 'Printing', description: 'Guidance and coordination for physical book printing.' },
  { icon: Globe2, title: 'Digital Publishing', description: 'eBook conversion and distribution support across digital storefronts.' },
  { icon: Truck, title: 'Distribution', description: 'Information on available distribution channels, print and digital.' },
];

export default function ServicesPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        eyebrow="End to end"
        title="Publishing Services"
        description="Everything a manuscript needs on its way to becoming a finished, distributed book."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-sm border border-rule bg-surface p-7 shadow-card">
            <Icon size={24} className="text-gold" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-lg text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 rounded-sm border border-rule bg-ink px-8 py-14 text-center">
        <h2 className="font-display text-2xl text-paper sm:text-3xl">Ready to start your publishing journey?</h2>
        <Link href="/publish" className="btn-gold">
          Publish Your Book <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
