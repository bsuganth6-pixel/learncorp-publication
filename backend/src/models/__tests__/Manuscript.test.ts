import { Manuscript } from '../Manuscript';

const validManuscript = () => ({
  authorName: 'Jane Doe', email: 'jane@example.com', phone: '9876543210', bookTitle: 'My First Novel',
  category: 'Fiction', language: 'English', description: 'A description long enough to pass validation checks.',
  authorBio: 'Short bio here.', format: 'Paperback', manuscriptFileUrl: 'https://storage.example.com/manuscripts/abc.pdf',
  manuscriptFileKey: 'manuscripts/abc.pdf', agreedToTerms: true,
});

describe('Manuscript schema validation', () => {
  it('accepts a well-formed submission and defaults status to Submitted', () => {
    const m = new Manuscript(validManuscript());
    expect(m.validateSync()).toBeUndefined();
    expect(m.status).toBe('Submitted');
  });
  it('rejects an invalid status value', () => {
    expect(new Manuscript({ ...validManuscript(), status: 'Ghostwritten' }).validateSync()?.errors.status).toBeDefined();
  });
  it('rejects a missing manuscript file reference', () => {
    const rest: Partial<ReturnType<typeof validManuscript>> = validManuscript();
    delete rest.manuscriptFileUrl;
    expect(new Manuscript(rest).validateSync()?.errors.manuscriptFileUrl).toBeDefined();
  });
});
