import { submitManuscriptSchema } from '../manuscriptValidators';

// What arrives from the frontend's multipart/form-data submission: every field
// is a string, since FormData has no native numbers or booleans.
const validRawInput = () => ({
  authorName: 'Jane Doe', email: 'jane@example.com', phone: '9876543210', bookTitle: 'My Novel',
  category: 'Fiction', language: 'English', pageCount: '',
  description: 'A description that is long enough to pass validation checks here.',
  authorBio: 'A short author bio that is long enough.', format: 'Paperback',
  previousExperience: '', additionalInfo: '', agreedToTerms: 'true',
});

describe('submitManuscriptSchema — raw string input as sent by multipart/form-data', () => {
  it('accepts a valid submission with an intentionally blank optional pageCount', () => {
    const result = submitManuscriptSchema.safeParse(validRawInput());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pageCount).toBeUndefined();
  });

  it('coerces a numeric pageCount string correctly when provided', () => {
    const result = submitManuscriptSchema.safeParse({ ...validRawInput(), pageCount: '250' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pageCount).toBe(250);
  });

  it('rejects agreedToTerms="false" instead of coercing it to true', () => {
    expect(submitManuscriptSchema.safeParse({ ...validRawInput(), agreedToTerms: 'false' }).success).toBe(false);
  });

  it('rejects a missing agreedToTerms field entirely', () => {
    const rest: Partial<ReturnType<typeof validRawInput>> = validRawInput();
    delete rest.agreedToTerms;
    expect(submitManuscriptSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts agreedToTerms="true"', () => {
    const result = submitManuscriptSchema.safeParse(validRawInput());
    expect(result.success && result.data.agreedToTerms).toBe(true);
  });
});
