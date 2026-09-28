'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-rule border-y border-rule">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-lg text-ink">{item.question}</span>
              <ChevronDown size={18} className={cn('shrink-0 text-gold transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <p className="pb-5 text-sm leading-relaxed text-ink-soft">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
