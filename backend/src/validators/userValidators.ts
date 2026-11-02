import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from '../models/User';
import { AUDIT_ACTIONS } from '../models/AuditLog';
import { objectId } from './common';

export const idParamSchema = z.object({ id: objectId });

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
  reason: z.string().trim().max(300).optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  action: z.enum(AUDIT_ACTIONS).optional(),
  search: z.string().trim().max(100).optional(),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.enum(['true', 'false']).optional(),
});

export type UserQuery = z.infer<typeof userQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
