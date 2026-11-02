import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import type { NotificationQuery } from '../validators/userValidators';

// Every query is scoped to req.user, so another account's notification can't be read or changed by guessing its id.

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, unread } = req.query as unknown as NotificationQuery;
  const filter = { user: req.user!._id, ...(unread === 'true' ? { readAt: null } : {}) };

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user!._id, readAt: null }),
  ]);

  res.json({
    success: true,
    data: items.map((n) => ({
      id: n.id as string, type: n.type, title: n.title, message: n.message, link: n.link ?? null,
      read: n.readAt !== null && n.readAt !== undefined, createdAt: n.createdAt,
    })),
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user!._id },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!updated) throw ApiError.notFound('Notification not found');
  res.json({ success: true });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.user!._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true });
});
