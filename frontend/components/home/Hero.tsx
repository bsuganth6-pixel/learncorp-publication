import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule bg-ink">
      <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <p className="section-label text-gold-light">LearnCorp Publication</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] text-paper sm:text-5xl lg:text-6xl">
            Your Story. <br className="hidden sm:block" />
            Your Knowledge. <br className="hidden sm:block" />
            <span className="text-gold-light">Your Book.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-paper/70">
            A platform for authors to transform ideas and manuscripts into professionally
            published books — editing, design, ISBN, printing, and distribution, handled end to
            end.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/books" className="btn-gold">
              Explore Books <ArrowRight size={16} />
            </Link>
            <Link href="/publish" className="btn-outline-light">
              <BookOpen size={16} /> Publish Your Book
            </Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute -inset-4 rounded-sm border border-gold-light/20" />
          <div className="relative h-full w-full overflow-hidden rounded-sm bg-paper/5 p-10">
            <Image
              src="/logo.png"
              alt="LearnCorp Publication"
              fill
              className="object-contain p-6"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
