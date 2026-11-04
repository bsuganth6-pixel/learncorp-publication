import type { Metadata } from 'next';
import SubmissionDetail from '@/components/author/SubmissionDetail';

export const metadata: Metadata = { title: 'Submission' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
