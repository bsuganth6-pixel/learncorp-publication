import type { Metadata } from 'next';
import Accordion from '@/components/ui/Accordion';
import SectionHeading from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about publishing your book with LearnCorp Publication.',
};

const FAQS = [
  { question: 'How can I publish my book?', answer: 'Submit your manuscript through our Publish Your Book page. Our team evaluates it, then guides you through editing, formatting, cover design, and release.' },
  { question: 'Do you provide ISBN?', answer: 'Yes — ISBN registration and publication metadata are handled as part of our publishing service.' },
  { question: 'How long does publishing take?', answer: 'Timelines vary by manuscript and format, but most books move from acceptance to release within a few months once editing begins.' },
  { question: 'Do you provide cover design?', answer: 'Yes — professional front, back, and spine cover design is included in our publishing services.' },
  { question: 'Do you publish eBooks?', answer: 'Yes, alongside paperback and hardcover — we handle eBook conversion and digital distribution.' },
  { question: 'Do you provide printing?', answer: 'Yes — we coordinate physical print production for paperback and hardcover editions.' },
  { question: 'How can I submit my manuscript?', answer: 'Use the manuscript submission form on the Publish Your Book page, including your manuscript file and a short synopsis.' },
  { question: 'Where will my book be available?', answer: 'Published books are made available through our catalogue and, depending on format, digital storefronts and print distribution channels.' },
  { question: 'Can new authors publish?', answer: 'Absolutely — we work with first-time authors as often as established ones. Prior publishing experience isn\u2019t required.' },
  { question: 'How can I contact the publishing team?', answer: 'Reach us through the Contact page — by form, email, phone, or WhatsApp, listed there.' },
];

export default function FaqPage() {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <SectionHeading eyebrow="Questions" title="Frequently Asked Questions" align="center" />
      <div className="mt-10">
        <Accordion items={FAQS} />
      </div>
    </div>
  );
}
