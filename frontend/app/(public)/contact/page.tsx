import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import ContactForm from '@/components/forms/ContactForm';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with LearnCorp Publication — email, phone, WhatsApp, or the form below.',
};

const DETAILS = [
  { icon: MapPin, label: 'Address', value: 'Tiruvallur, Tamil Nadu, India' },
  { icon: Mail, label: 'Email', value: 'hello@learncorppublication.com', href: 'mailto:hello@learncorppublication.com' },
  { icon: Phone, label: 'Phone', value: '+91 00000 00000', href: 'tel:+910000000000' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+91 00000 00000', href: 'https://wa.me/910000000000' },
  { icon: Clock, label: 'Business Hours', value: 'Mon–Sat, 10:00 AM – 6:00 PM IST' },
];

export default function ContactPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="Get in touch" title="Contact Us" description="Questions about publishing, an existing submission, or anything else — we're glad to help." />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <ul className="space-y-5">
            {DETAILS.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-gold" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm font-medium text-ink hover:text-gold">{value}</a>
                  ) : (
                    <p className="text-sm font-medium text-ink">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 overflow-hidden rounded-sm border border-rule">
            <iframe
              title="Location map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=79.85%2C13.10%2C79.95%2C13.18&layer=mapnik"
              className="h-56 w-full"
              loading="lazy"
            />
          </div>
        </div>

        <div className="rounded-sm border border-rule bg-surface p-6 shadow-card sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
