import { Types } from 'mongoose';
import { Notification, NotificationType } from '../models/Notification';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Creates an in-app notification. Never throws: a notification is a courtesy, not part of the transaction. */
export async function notifyUser(userId: Types.ObjectId | string, input: NotificationInput): Promise<void> {
  try {
    await Notification.create({ user: userId, ...input });
  } catch (err) {
    console.error('[notification] not created:', err instanceof Error ? err.message : err);
  }
}
