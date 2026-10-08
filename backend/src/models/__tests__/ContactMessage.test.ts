import { ContactMessage } from '../ContactMessage';

describe('ContactMessage schema validation', () => {
  it('accepts a well-formed message and defaults read to false', () => {
    const msg = new ContactMessage({ name: 'Jane', email: 'jane@example.com', subject: 'Hello', message: 'Hi there' });
    expect(msg.validateSync()).toBeUndefined();
    expect(msg.read).toBe(false);
  });
  it('rejects a missing message body', () => {
    expect(new ContactMessage({ name: 'Jane', email: 'jane@example.com', subject: 'Hello' }).validateSync()?.errors.message).toBeDefined();
  });
});
