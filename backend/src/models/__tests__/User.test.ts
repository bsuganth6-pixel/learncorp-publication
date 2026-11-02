import { User, USER_ROLES, isAdminRole } from '../User';

const valid = { name: 'Asha', email: 'asha@example.com', password: 'longenough' };

describe('User schema validation (validateSync — no DB connection needed)', () => {
  it('accepts a well-formed user', () => {
    expect(new User(valid).validateSync()).toBeUndefined();
  });
  it('rejects a missing name', () => {
    expect(new User({ email: valid.email, password: valid.password }).validateSync()?.errors.name).toBeDefined();
  });
  it('rejects a malformed email', () => {
    expect(new User({ ...valid, email: 'not-an-email' }).validateSync()?.errors.email).toBeDefined();
  });
  it('rejects a password under 8 characters', () => {
    expect(new User({ ...valid, password: 'short' }).validateSync()?.errors.password).toBeDefined();
  });
  it('rejects an invalid role or status', () => {
    expect(new User({ ...valid, role: 'root' }).validateSync()?.errors.role).toBeDefined();
    expect(new User({ ...valid, status: 'banned' }).validateSync()?.errors.status).toBeDefined();
  });
  it('never selects the password hash by default (select: false)', () => {
    const path = User.schema.path('password') as unknown as { options: { select?: boolean } };
    expect(path.options.select).toBe(false);
  });
});

describe('least-privilege defaults', () => {
  it('a new account is an unverified, active author', () => {
    const user = new User(valid);
    expect(user.role).toBe('author');
    expect(user.status).toBe('active');
    expect(user.emailVerified).toBe(false);
  });
  it('knows which roles are administrative', () => {
    expect(USER_ROLES).toEqual(['author', 'admin', 'superadmin']);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(isAdminRole('author')).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });
  it('normalises the email to lower case', () => {
    expect(new User({ ...valid, email: '  Asha@Example.COM ' }).email).toBe('asha@example.com');
  });
});
