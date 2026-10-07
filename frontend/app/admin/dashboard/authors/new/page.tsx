import PageHeader from '@/components/admin/PageHeader';
import AuthorForm from '@/components/admin/AuthorForm';

export default function NewAuthorPage() {
  return (
    <div>
      <PageHeader title="Add Author" description="Create a new author profile." />
      <AuthorForm />
    </div>
  );
}
