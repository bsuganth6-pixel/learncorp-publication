import PageHeader from '@/components/admin/PageHeader';
import BookForm from '@/components/admin/BookForm';

export default function NewBookPage() {
  return (
    <div>
      <PageHeader title="Add Book" description="Create a new catalogue entry." />
      <BookForm />
    </div>
  );
}
