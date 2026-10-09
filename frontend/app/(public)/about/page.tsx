import type { Metadata } from 'next';
import { Target, Eye, Heart, BookOpen, Users } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { siteConfig } from '@/lib/site-config';
import { initials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Who ${siteConfig.name} is — our story, vision, mission, values, and publishing philosophy.`,
};

// Draft copy: the project spec lists these sections but supplies no text, so
// the statements below are generic and should be reviewed/replaced by the owner.
const VALUES = [
  { icon: Heart, title: 'Author First', description: 'Every decision starts with what serves the author and their book.' },
  { icon: BookOpen, title: 'Editorial Integrity', description: "We protect a book's voice while sharpening its craft." },
  { icon: Users, title: 'Transparency', description: 'Clear status and clear communication at every stage.' },
];

const { story, team, achievements } = siteConfig.about;

export default function AboutPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        eyebrow="About us"
        title="Who We Are"
        description={`${siteConfig.name} is a platform for authors to transform ideas and manuscripts into professionally published books.`}
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-ink">Our Story</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{story}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink">Publishing Philosophy</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            A book should read the way its author intended and look like it belongs on any shelf, digital or
            physical. We edit for clarity, design for the genre, and treat the unseen production steps as seriously
            as the visible ones.
          </p>
        </div>
      </div>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        <div className="rounded-sm border border-rule p-7">
          <Target size={24} className="text-gold" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="mt-4 font-display text-xl text-ink">Mission</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            To give every author, new or established, a professional and transparent path from manuscript to
            published book.
          </p>
        </div>
        <div className="rounded-sm border border-rule p-7">
          <Eye size={24} className="text-gold" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="mt-4 font-display text-xl text-ink">Vision</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            A publishing landscape where quality production and wide distribution are open to any author with a
            story worth telling.
          </p>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl text-ink">Our Values</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon size={22} className="text-gold" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {team.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-2xl text-ink">Our Team</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <li key={member.name} className="flex flex-col items-center rounded-sm border border-rule bg-surface p-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 font-display text-lg text-ink-soft" aria-hidden="true">
                  {initials(member.name)}
                </span>
                <p className="mt-3 font-display text-lg text-ink">{member.name}</p>
                <p className="text-sm text-ink-soft">{member.role}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {achievements.length > 0 && (
        <div className="mt-14 rounded-sm border border-rule bg-ink px-8 py-14">
          <h2 className="text-center font-display text-2xl text-paper">Our Achievements</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {achievements.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-3xl text-gold-light">{value}</p>
                <p className="mt-1 text-sm text-paper/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
