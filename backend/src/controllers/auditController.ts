import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/escapeRegex';
import type { AuditQuery } from '../validators/userValidators';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, action, search } = req.query as unknown as AuditQuery;

  const filter: FilterQuery<IAuditLog> = {};
  if (action) filter.action = action;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ actorEmail: rx }, { summary: rx }];
  }

  const [entries, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: entries.map((e) => ({
      id: e.id as string,
      action: e.action,
      actorEmail: e.actorEmail,
      actorRole: e.actorRole ?? null,
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      summary: e.summary,
      ip: e.ip ?? '',
      createdAt: e.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
