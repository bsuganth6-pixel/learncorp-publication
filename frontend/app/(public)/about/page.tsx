import type { Metadata } from 'next';
import { Target, Eye, Heart, BookOpen, Users, Trophy } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Who LearnCorp Publication is, our story, vision, mission, values, and publishing philosophy.',
};

const VALUES = [
  { icon: Heart, title: 'Author First', description: 'Every decision starts with what serves the author and their book.' },
  { icon: BookOpen, title: 'Editorial Integrity', description: "We protect a book's voice while sharpening its craft." },
  { icon: Users, title: 'Transparency', description: 'Clear status, clear pricing, clear timelines — always.' },
];

const ACHIEVEMENTS = [
  { icon: Trophy, value: '250+', label: 'Titles published across genres' },
  { icon: Users, value: '120+', label: 'Authors supported to date' },
  { icon: BookOpen, value: '30+', label: 'Countries reached in distribution' },
];

export default function AboutPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="About us" title="Who We Are" description="LearnCorp Publication is an independent publishing platform built to take authors from manuscript to market with professional editorial, design, and distribution support." />

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-ink">Our Story</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            LearnCorp Publication started with a simple observation: too many good manuscripts
            never became good books, not for lack of talent, but for lack of a clear, professional
            path to publication. We built that path — evaluation, editing, design, formatting,
            ISBN, printing, and distribution, under one roof.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink">Publishing Philosophy</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            A book should read like the author intended and look like it belongs on any shelf,
            digital or physical. We edit for clarity, design for the genre, and never cut corners
            on the steps a reader never sees but always feels.
          </p>
        </div>
      </div>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        <div className="rounded-sm border border-rule p-7">
          <Target size={24} className="text-gold" strokeWidth={1.5} />
          <h3 className="mt-4 font-display text-xl text-ink">Mission</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            To give every author, new or established, a professional, transparent path from
            manuscript to published book.
          </p>
        </div>
        <div className="rounded-sm border border-rule p-7">
          <Eye size={24} className="text-gold" strokeWidth={1.5} />
          <h3 className="mt-4 font-display text-xl text-ink">Vision</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            A publishing industry where quality production and global distribution aren&apos;t
            gated behind an author&apos;s existing connections.
          </p>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl text-ink">Our Values</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon size={22} className="text-gold" strokeWidth={1.5} />
              <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 rounded-sm border border-rule bg-ink px-8 py-14">
        <h2 className="text-center font-display text-2xl text-paper">Our Achievements</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {ACHIEVEMENTS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <Icon size={22} className="mx-auto text-gold-light" strokeWidth={1.5} />
              <p className="mt-3 font-display text-3xl text-paper">{value}</p>
              <p className="mt-1 text-sm text-paper/60">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
