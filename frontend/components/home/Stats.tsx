const STATS = [
  { value: '250+', label: 'Books Published' },
  { value: '120+', label: 'Authors Supported' },
  { value: '18', label: 'Categories' },
  { value: '30+', label: 'Countries Reached' },
];

export default function Stats() {
  return (
    <section className="border-b border-rule bg-ink py-16">
      <div className="container-page grid grid-cols-2 gap-8 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-4xl text-gold-light sm:text-5xl">{stat.value}</p>
            <p className="mt-2 text-sm text-paper/60">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
