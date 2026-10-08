import { User } from '../User';

describe('User schema validation (validateSync — no DB connection needed)', () => {
  it('accepts a well-formed user', () => {
    expect(new User({ name: 'Admin', email: 'admin@example.com', password: 'longenough' }).validateSync()).toBeUndefined();
  });
  it('rejects a missing name', () => {
    expect(new User({ email: 'admin@example.com', password: 'longenough' }).validateSync()?.errors.name).toBeDefined();
  });
  it('rejects a malformed email', () => {
    expect(new User({ name: 'Admin', email: 'not-an-email', password: 'longenough' }).validateSync()?.errors.email).toBeDefined();
  });
  it('rejects a password under 8 characters', () => {
    expect(new User({ name: 'Admin', email: 'admin@example.com', password: 'short' }).validateSync()?.errors.password).toBeDefined();
  });
  it('rejects an invalid role', () => {
    const user = new User({ name: 'Admin', email: 'admin@example.com', password: 'longenough', role: 'root' });
    expect(user.validateSync()?.errors.role).toBeDefined();
  });
  it('never selects the password hash by default (select: false)', () => {
    const path = User.schema.path('password') as unknown as { options: { select?: boolean } };
    expect(path.options.select).toBe(false);
  });
});
