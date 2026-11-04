import type { Metadata } from 'next';
import SubmissionsList from '@/components/author/SubmissionsList';

export const metadata: Metadata = { title: 'My submissions' };

export default function Page() {
  return <SubmissionsList />;
}
