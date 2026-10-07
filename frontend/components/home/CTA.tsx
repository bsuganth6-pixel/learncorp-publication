import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="flex flex-col items-center gap-6 rounded-sm border border-rule bg-ink px-8 py-16 text-center">
          <p className="section-label text-gold-light">Ready when you are</p>
          <h2 className="max-w-xl font-display text-3xl text-paper sm:text-4xl">
            Have a manuscript ready? Publish your book with us.
          </h2>
          <Link href="/publish" className="btn-gold">
            Submit Your Manuscript <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
