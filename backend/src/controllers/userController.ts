import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { User, IUser, isAdminRole } from '../models/User';
import { Manuscript } from '../models/Manuscript';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/escapeRegex';
import { serializeUser } from '../utils/serializers';
import { revokeAllUserSessions } from '../services/sessionService';
import { audit } from '../services/auditService';
import type { UserQuery } from '../validators/userValidators';

/** Who may act on whom. Authors are managed by any admin; admin accounts only by a super admin; never yourself. */
function assertCanManage(actor: IUser, target: IUser): void {
  if (target.id === actor.id) throw ApiError.forbidden('You can’t change your own account here.');
  if (isAdminRole(target.role) && actor.role !== 'superadmin') {
    throw ApiError.forbidden('Only a super admin can change an administrator account.');
  }
}

async function submissionCounts(userIds: unknown[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const rows: Array<{ _id: unknown; count: number }> = await Manuscript.aggregate([
    { $match: { author: { $in: userIds } } },
    { $group: { _id: '$author', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, role, status, search } = req.query as unknown as UserQuery;

  const filter: FilterQuery<IUser> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  const counts = await submissionCounts(users.map((u) => u._id));

  res.json({
    success: true,
    data: users.map((u) => ({ ...serializeUser(u), submissions: counts[u.id] ?? 0, suspensionReason: u.suspensionReason ?? '' })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const counts = await submissionCounts([user._id]);
  res.json({ success: true, data: { ...serializeUser(user), submissions: counts[user.id] ?? 0, suspensionReason: user.suspensionReason ?? '' } });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, reason } = req.body as { status: 'active' | 'suspended'; reason?: string };

  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');
  assertCanManage(req.user!, target);

  if (target.status === status) {
    res.json({ success: true, data: serializeUser(target) });
    return;
  }

  target.status = status;
  target.suspendedAt = status === 'suspended' ? new Date() : undefined;
  target.suspensionReason = status === 'suspended' ? reason || undefined : undefined;
  await target.save();

  // Suspension takes effect immediately, not at the next sign-in.
  if (status === 'suspended') await revokeAllUserSessions(target._id, 'account_suspended');

  await audit(req, {
    action: status === 'suspended' ? 'user.suspended' : 'user.reactivated',
    targetType: 'user',
    targetId: target.id,
    summary: `${status === 'suspended' ? 'Suspended' : 'Reactivated'} ${target.role} account ${target.email}${reason ? ` (${reason})` : ''}`,
  });
  res.json({ success: true, data: serializeUser(target) });
});

export const revokeUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');
  assertCanManage(req.user!, target);

  const revoked = await revokeAllUserSessions(target._id, 'revoked_by_admin');
  await audit(req, {
    action: 'user.sessions_revoked',
    targetType: 'user',
    targetId: target.id,
    summary: `Signed ${target.email} out of ${revoked} active session(s)`,
  });
  res.json({ success: true, revoked });
});
