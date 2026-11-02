import { Request } from 'express';
import { AuditLog, AuditAction } from '../models/AuditLog';
import { getClientIp, getUserAgent } from '../utils/clientInfo';

export interface AuditEntry {
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  /** One human-readable sentence. Never put passwords, tokens or file contents in here. */
  summary: string;
  /** For events with no signed-in user (a failed admin login names the attempted email). */
  actorEmail?: string;
}

/**
 * Records a sensitive action. It is awaited by callers so the row exists before the response is
 * sent, but it can never fail the request: a logging outage must not block an admin's work.
 */
export async function audit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorEmail: (req.user?.email ?? entry.actorEmail ?? 'unknown').slice(0, 254),
      actorRole: req.user?.role,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary.slice(0, 500),
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  } catch (err) {
    console.error(`[audit] could not record ${entry.action}:`, err instanceof Error ? err.message : err);
  }
}
