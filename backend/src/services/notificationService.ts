import { prisma } from '../prisma/client.js';

export class NotificationService {
  static async send(
    userId: string,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO',
    linkUrl?: string
  ) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          linkUrl,
        },
      });
    } catch (err) {
      console.error('[NOTIFICATION_ERROR] Failed to send notification:', err);
    }
  }

  static async notifyRole(
    role: string,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO',
    linkUrl?: string
  ) {
    try {
      const users = await prisma.user.findMany({
        where: { role: role as any, isActive: true },
        select: { id: true },
      });

      for (const u of users) {
        await this.send(u.id, title, message, type, linkUrl);
      }
    } catch (err) {
      console.error(`[NOTIFICATION_ERROR] Failed to broadcast to role ${role}:`, err);
    }
  }
}
