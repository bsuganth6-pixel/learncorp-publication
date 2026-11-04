import type { Metadata } from 'next';
import NotificationsList from '@/components/author/NotificationsList';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return <NotificationsList />;
}
