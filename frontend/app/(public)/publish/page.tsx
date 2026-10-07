import type { Metadata } from 'next';
import ManuscriptForm from '@/components/forms/ManuscriptForm';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'Publish Your Book',
  description: 'Submit your manuscript to LearnCorp Publication and follow our 8-step path to publication.',
};

const STEPS = [
  'Submit Manuscript', 'Manuscript Evaluation', 'Editing & Proofreading', 'Book Formatting',
  'Cover Design', 'ISBN & Metadata', 'Publishing', 'Distribution',
];

export default function PublishPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        eyebrow="Your path to publication"
        title="Publish Your Book"
        description="Eight steps, one dedicated team — from first draft to distributed book."
      />

      <ol className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step} className="relative">
            <span className="font-display text-3xl text-gold/40">{String(i + 1).padStart(2, '0')}</span>
            <p className="mt-1 text-sm font-medium text-ink">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 rounded-sm border border-rule bg-surface p-6 shadow-card sm:p-10">
        <h2 className="font-display text-2xl text-ink">Manuscript Submission</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Tell us about you and your book — our editorial team reviews every submission.
        </p>
        <div className="mt-8">
          <ManuscriptForm />
        </div>
      </div>
    </div>
  );
}
