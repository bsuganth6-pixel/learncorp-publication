import { getPublicStats } from '@/lib/api-client';

// Real numbers from the database (not marketing copy). Hidden entirely until
// there is something to show, so a new site never advertises "0 books".
export default async function Stats() {
  const result = await getPublicStats();
  const stats = result?.data;
  if (!stats || (stats.publishedBooks === 0 && stats.authors === 0)) return null;

  const items = [
    { value: stats.publishedBooks, label: 'Books Published' },
    { value: stats.authors, label: 'Authors' },
    { value: stats.categories, label: 'Categories' },
  ];

  return (
    <section className="border-b border-rule bg-ink py-16" aria-label="Catalogue statistics">
      <div className="container-page grid grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-display text-4xl text-gold-light sm:text-5xl">{item.value}</p>
            <p className="mt-2 text-sm text-paper/70">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
