import { prisma } from '../../config/database.js';
import type { Notification, Prisma } from '@prisma/client';
import type { UserId } from '../../common/types/branded.js';
import { decodeCursor } from '../../common/utils/pagination.js';

function resolveCursorId(cursor?: string): string | undefined {
  if (!cursor) return undefined;
  try {
    return decodeCursor(cursor);
  } catch {
    return cursor;
  }
}

export class NotificationRepository {
  async create(data: Omit<Notification, 'id' | 'readAt' | 'createdAt'>): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  }

  async listByUser(
    userId: UserId,
    limit: number,
    cursor?: string,
    unreadOnly?: boolean,
  ): Promise<{ items: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const cursorId = resolveCursorId(cursor);

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit + 1,
        ...(cursorId && { skip: 1, cursor: { id: cursorId } }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async markRead(id: string, userId: UserId): Promise<Notification | null> {
    try {
      return await prisma.notification.update({
        where: { id, userId },
        data: { readAt: new Date() },
      });
    } catch (e: any) {
      if (e.code === 'P2025') return null;
      throw e;
    }
  }

  async markAllRead(userId: UserId): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async countUnread(userId: UserId): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }
}

export const notificationRepository = new NotificationRepository();
