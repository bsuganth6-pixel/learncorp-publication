import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  icon: Icon, label, value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-sm border border-rule bg-surface p-5 shadow-card">
      <Icon size={20} className="text-gold" strokeWidth={1.5} />
      <p className="mt-3 font-display text-2xl text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{label}</p>
    </div>
  );
}
