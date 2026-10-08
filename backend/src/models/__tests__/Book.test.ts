import { Types } from 'mongoose';
import { Book, computeRatingsAvg } from '../Book';

const validBook = () => ({
  title: 'Test Book', slug: 'test-book', authors: [new Types.ObjectId()], description: 'A description long enough.',
  isbn: '9781234567890', category: 'Fiction', language: 'English', format: 'Paperback', price: 499,
  coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
});

describe('Book schema validation', () => {
  it('accepts a well-formed book', () => {
    expect(new Book(validBook()).validateSync()).toBeUndefined();
  });
  it('rejects an invalid format enum value', () => {
    expect(new Book({ ...validBook(), format: 'Scroll' }).validateSync()?.errors.format).toBeDefined();
  });
  it('rejects a negative price', () => {
    expect(new Book({ ...validBook(), price: -10 }).validateSync()?.errors.price).toBeDefined();
  });
  it('rejects a missing ISBN', () => {
    const rest: Partial<ReturnType<typeof validBook>> = validBook();
    delete rest.isbn;
    expect(new Book(rest).validateSync()?.errors.isbn).toBeDefined();
  });
  it('rejects an empty authors array', () => {
    expect(new Book({ ...validBook(), authors: [] }).validateSync()?.errors.authors).toBeDefined();
  });
});

describe('computeRatingsAvg (pure function backing the pre-save hook)', () => {
  it('returns 0 for no reviews', () => {
    expect(computeRatingsAvg([])).toBe(0);
  });
  it('averages and rounds to 1 decimal place', () => {
    expect(computeRatingsAvg([{ rating: 4 }, { rating: 2 }])).toBe(3);
    expect(computeRatingsAvg([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toBe(4.3);
  });
});
