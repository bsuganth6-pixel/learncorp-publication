'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Users, FileText, Mail, Quote, UsersRound, Hourglass } from 'lucide-react';
import { getDashboardStats } from '@/lib/api-client';
import StatCard from '@/components/admin/StatCard';

interface Stats {
  totalBooks: number; publishedBooks: number; draftBooks: number; totalAuthors: number;
  manuscripts: Record<string, number>; unreadMessages: number; pendingTestimonials: number;
  registeredAuthors: number;
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getDashboardStats().then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  // "Awaiting review" is everything an editor has to act on; "waiting on authors" is everything the editors already answered.
  const awaitingReview = (stats?.manuscripts?.Submitted || 0) + (stats?.manuscripts?.['Under Review'] || 0);
  const waitingOnAuthors = stats?.manuscripts?.['Changes Requested'] || 0;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-soft">A snapshot of the catalogue and inbox.</p>

      {!stats ? (
        <p className="mt-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={BookOpen} label="Total Books" value={stats.totalBooks} />
          <StatCard icon={CheckCircle2} label="Published Books" value={stats.publishedBooks} />
          <StatCard icon={Users} label="Author Profiles" value={stats.totalAuthors} />
          <StatCard icon={UsersRound} label="Registered Authors" value={stats.registeredAuthors ?? 0} />
          <StatCard icon={FileText} label="Manuscripts Awaiting Review" value={awaitingReview} />
          <StatCard icon={Hourglass} label="Waiting on Authors" value={waitingOnAuthors} />
          <StatCard icon={Mail} label="Unread Messages" value={stats.unreadMessages} />
          <StatCard icon={Quote} label="Testimonials Pending" value={stats.pendingTestimonials} />
        </div>
      )}
    </div>
  );
}
