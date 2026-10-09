import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, MessageCircle, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import ContactForm from '@/components/forms/ContactForm';
import SectionHeading from '@/components/ui/SectionHeading';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with ${siteConfig.name} — by form, email, phone, or WhatsApp.`,
};

const { contact, social } = siteConfig;

// Rows with an empty value are skipped rather than showing invented details.
const DETAILS = [
  { icon: MapPin, label: 'Address', value: contact.address, href: '' },
  { icon: Mail, label: 'Email', value: contact.email, href: contact.email ? `mailto:${contact.email}` : '' },
  { icon: Phone, label: 'Phone', value: contact.phone, href: contact.phone ? `tel:${contact.phone.replace(/[^+\d]/g, '')}` : '' },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: contact.whatsapp ? `+${contact.whatsapp}` : '',
    href: contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : '',
  },
  { icon: Clock, label: 'Business Hours', value: contact.hours, href: '' },
].filter((d) => d.value);

const SOCIALS = [
  { icon: Facebook, label: 'Facebook', href: social.facebook },
  { icon: Instagram, label: 'Instagram', href: social.instagram },
  { icon: Linkedin, label: 'LinkedIn', href: social.linkedin },
  { icon: Twitter, label: 'X / Twitter', href: social.twitter },
].filter((s) => s.href);

export default function ContactPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading eyebrow="Get in touch" title="Contact Us" description="Questions about publishing, an existing submission, or anything else — we're glad to help." />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="text-sm font-medium text-ink">{siteConfig.name}</p>
          <ul className="mt-4 space-y-5">
            {DETAILS.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
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

          {SOCIALS.length > 0 && (
            <div className="mt-6 flex gap-4">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-ink-soft hover:text-gold">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          )}

          {contact.mapEmbedUrl && (
            <div className="mt-8 overflow-hidden rounded-sm border border-rule">
              <iframe title="Location map" src={contact.mapEmbedUrl} className="h-56 w-full" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>

        <div className="rounded-sm border border-rule bg-surface p-6 shadow-card sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
