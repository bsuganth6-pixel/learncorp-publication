import { Request, Response } from 'express';
import { User, IUser, isAdminRole } from '../models/User';
import { Notification } from '../models/Notification';
import { SessionScope } from '../models/Session';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { runInBackground } from '../utils/background';
import { burnPasswordCheck } from '../utils/password';
import { setSessionCookies, clearSessionCookies } from '../utils/cookies';
import { describeUserAgent } from '../utils/clientInfo';
import { serializeUser } from '../utils/serializers';
import { sessionCookieName } from '../config/auth';
import {
  createSession, resolveSession, revokeSessionByToken, revokeAllUserSessions, revokeUserSession, listActiveSessions,
} from '../services/sessionService';
import { issueAuthToken, consumeAuthToken, peekAuthToken, voidAuthTokens } from '../services/authTokenService';
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/accountMail';
import { audit } from '../services/auditService';
import type {
  RegisterInput, LoginInput, ResetPasswordInput, ChangePasswordInput, UpdateProfileInput,
} from '../validators/authValidators';

// One message for every way a sign-in can fail, so responses never reveal which emails exist.
const INVALID_CREDENTIALS = 'Incorrect email or password';
const SUSPENDED = 'This account has been suspended. Please contact us if you think this is a mistake.';
const INVALID_RESET_LINK = 'This reset link is invalid or has expired. Request a new one.';

/** Finds the account and checks the password. A missing or ineligible account still costs a password check. */
async function authenticate(email: string, password: string, eligible: (user: IUser) => boolean): Promise<IUser | null> {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !eligible(user)) {
    await burnPasswordCheck(password);
    return null;
  }
  return (await user.comparePassword(password)) ? user : null;
}

async function startSession(req: Request, res: Response, user: IUser, scope: SessionScope, remember = false): Promise<void> {
  // Whatever session the browser arrived with is retired: a new sign-in always gets a new token.
  await revokeSessionByToken(req.cookies?.[sessionCookieName()], 'replaced_by_login');
  const issued = await createSession({ user, scope, persistent: remember, req });
  setSessionCookies(res, issued, scope);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
}

// ---------------------------------------------------------------- registration & email confirmation

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body as RegisterInput;

  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists. Sign in, or reset your password.');
  }

  // Role is fixed here. Nothing in the request body can choose it.
  const user = await User.create({
    name,
    email,
    phone: phone || '',
    password,
    role: 'author',
    status: 'active',
    emailVerified: false,
    termsAcceptedAt: new Date(),
  });

  const token = await issueAuthToken(user._id, 'email_verification');
  const emailSent = await sendVerificationEmail(user, token);

  await startSession(req, res, user, 'author');
  res.status(201).json({ success: true, data: serializeUser(user), emailSent });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const record = await consumeAuthToken(req.body.token, 'email_verification');
  if (!record) {
    throw ApiError.badRequest('This confirmation link is invalid or has expired. Request a new one from your account.');
  }
  await User.updateOne({ _id: record.user }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
  res.json({ success: true, message: 'Your email address is confirmed.' });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'author' || user.emailVerified) {
    res.json({ success: true, alreadyVerified: true, message: 'Your email address is already confirmed.' });
    return;
  }
  const token = await issueAuthToken(user._id, 'email_verification');
  const emailSent = await sendVerificationEmail(user, token);
  if (!emailSent) throw ApiError.internal('We couldn’t send the email right now. Please try again shortly.');
  res.json({ success: true, message: `We sent a new confirmation link to ${user.email}.` });
});

// ---------------------------------------------------------------- sign in / out

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body as LoginInput;

  // This form is for authors only; admin accounts sign in through /auth/admin/login.
  const user = await authenticate(email, password, (u) => u.role === 'author');
  if (!user) throw ApiError.unauthorized(INVALID_CREDENTIALS);
  if (user.status === 'suspended') throw ApiError.forbidden(SUSPENDED, 'ACCOUNT_SUSPENDED');

  await startSession(req, res, user, 'author', rememberMe);
  res.json({ success: true, data: serializeUser(user) });
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as Pick<LoginInput, 'email' | 'password'>;

  const user = await authenticate(email, password, (u) => isAdminRole(u.role));
  if (!user) {
    await audit(req, { action: 'auth.admin_login_failed', summary: 'Failed administrator sign-in', actorEmail: email });
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }
  if (user.status === 'suspended') throw ApiError.forbidden(SUSPENDED, 'ACCOUNT_SUSPENDED');

  await startSession(req, res, user, 'admin');
  req.user = user;
  await audit(req, { action: 'auth.admin_login', targetType: 'user', targetId: user.id, summary: 'Administrator signed in' });
  res.json({ success: true, data: serializeUser(user) });
});

/** Idempotent and open to stale cookies on purpose: signing out must always clear the browser. */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[sessionCookieName()];
  const resolved = await resolveSession(token);
  if (resolved?.session.scope === 'admin') {
    req.user = resolved.user;
    await audit(req, { action: 'auth.admin_logout', targetType: 'user', targetId: resolved.user.id, summary: 'Administrator signed out' });
  }
  await revokeSessionByToken(token, 'logout');
  clearSessionCookies(res);
  res.json({ success: true, message: 'Signed out' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await revokeAllUserSessions(req.user!._id, 'logout_all');
  clearSessionCookies(res);
  res.json({ success: true, message: 'Signed out everywhere' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const unreadNotifications = await Notification.countDocuments({ user: user._id, readAt: null });
  res.json({
    success: true,
    data: { ...serializeUser(user), unreadNotifications },
    session: { scope: req.authSession!.scope, expiresAt: req.authSession!.expiresAt },
  });
});

// ---------------------------------------------------------------- password recovery

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  // The lookup, token and email all happen after the response, so timing can't tell a registered
  // address from an unknown one, and the reply below is identical either way.
  runInBackground('password reset email', async () => {
    const user = await User.findOne({ email });
    if (!user || user.status === 'suspended') return;
    const token = await issueAuthToken(user._id, 'password_reset');
    await sendPasswordResetEmail(user, token);
  });

  res.json({ success: true, message: 'If an account exists for that email, we’ve sent instructions to reset the password.' });
});

export const validateResetToken = asyncHandler(async (req: Request, res: Response) => {
  if (!(await peekAuthToken(req.body.token, 'password_reset'))) throw ApiError.badRequest(INVALID_RESET_LINK);
  res.json({ success: true, valid: true });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as ResetPasswordInput;

  const record = await consumeAuthToken(token, 'password_reset');
  if (!record) throw ApiError.badRequest(INVALID_RESET_LINK);

  const user = await User.findById(record.user).select('+password');
  if (!user || user.status === 'suspended') throw ApiError.badRequest(INVALID_RESET_LINK);

  user.password = password;
  // Receiving the link proves control of the mailbox, which is what email confirmation is for.
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
  }
  await user.save();

  await voidAuthTokens(user._id, 'password_reset');
  await revokeAllUserSessions(user._id, 'password_reset');
  runInBackground('password changed email', () => sendPasswordChangedEmail(user));

  res.json({ success: true, message: 'Your password has been updated. Sign in with the new password.' });
});

// ---------------------------------------------------------------- account

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const updates = req.body as UpdateProfileInput;
  // Email and role are deliberately not editable here.
  user.set({
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
    ...(updates.website !== undefined ? { website: updates.website } : {}),
  });
  await user.save();
  res.json({ success: true, data: serializeUser(user) });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, password } = req.body as ChangePasswordInput;

  const user = await User.findById(req.user!._id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    // A 400 with a field error, not a 401: a wrong guess must not look like an expired session.
    throw ApiError.badRequest('Validation failed', { currentPassword: ['Current password is incorrect'] });
  }

  user.password = password;
  await user.save();
  // Every other device is signed out; this one stays.
  await revokeAllUserSessions(user._id, 'password_changed', req.authSession!._id);
  runInBackground('password changed email', () => sendPasswordChangedEmail(user));

  res.json({ success: true, message: 'Password updated. Other devices have been signed out.' });
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await listActiveSessions(req.user!._id);
  res.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id as string,
      device: describeUserAgent(s.userAgent),
      ip: s.ip ?? '',
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      persistent: s.persistent,
      current: s.id === req.authSession!.id,
    })),
  });
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const revoked = await revokeUserSession(req.user!._id, req.params.id, 'revoked_by_user');
  if (!revoked) throw ApiError.notFound('Session not found');
  if (req.params.id === req.authSession!.id) clearSessionCookies(res);
  res.json({ success: true, message: 'Session ended' });
});
