import { Author } from '../Author';

describe('Author schema validation', () => {
  it('accepts a well-formed author', () => {
    expect(new Author({ name: 'Jane Doe', slug: 'jane-doe' }).validateSync()).toBeUndefined();
  });
  it('rejects a missing slug', () => {
    expect(new Author({ name: 'Jane Doe' }).validateSync()?.errors.slug).toBeDefined();
  });
});
