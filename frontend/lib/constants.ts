export const BOOK_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Poetry', "Children's", 'Young Adult', 'Academic',
  'Business', 'Self-Help', 'Biography & Memoir', 'Science & Technology',
  'History', 'Health & Wellness',
] as const;

export const BOOK_FORMATS = ['Paperback', 'Hardcover', 'eBook', 'PDF', 'Audiobook'] as const;

export const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Spanish', 'French', 'German'] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title', label: 'Title: A–Z' },
] as const;

export const MANUSCRIPT_STATUSES = ['Submitted', 'Under Review', 'Accepted', 'Rejected', 'Published'] as const;
