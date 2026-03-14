import { Prisma } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { NotificationQueryInput } from './notification.schema';

const notificationSelect = {
  notificationId: true,
  title: true,
  body: true,
  type: true,
  isRead: true,
  resourceId: true,
  resourceType: true,
  createdAt: true,
} as const;

async function assertNotificationOwner(
  notificationId: string,
  userId: string,
) {
  const notif = await prisma.notification.findUnique({
    where: { notificationId },
    select: { notificationId: true, userId: true },
  });
  if (!notif) throw new AppError('Notifikasi tidak ditemukan', 404);
  if (notif.userId !== userId)
    throw new AppError('Akses ditolak ke notifikasi ini', 403);
  return notif;
}

export const notificationService = {
  /**
   * #95 — GET /api/notifications
   * List notifikasi milik req.user, bisa filter isRead & type.
   */
  findAll: async (userId: string, filters: NotificationQueryInput) => {
    const { isRead, type, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(isRead !== undefined ? { isRead } : {}),
      ...(type ? { type } : {}),
    };

    const [data, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: notificationSelect,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  },

  /**
   * #96 — PATCH /api/notifications/:notifId/read
   * Tandai satu notifikasi sudah dibaca.
   * Guard: hanya pemilik notifikasi.
   */
  markRead: async (notificationId: string, userId: string) => {
    await assertNotificationOwner(notificationId, userId);

    return prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
      select: notificationSelect,
    });
  },

  /**
   * #97 — PATCH /api/notifications/read-all
   * Tandai SEMUA notifikasi user sebagai sudah dibaca.
   * Menggunakan updateMany — tidak butuh loop.
   */
  markAllRead: async (userId: string) => {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updatedCount: result.count };
  },

  /**
   * #98 — DELETE /api/notifications/:notifId
   * Hapus satu notifikasi.
   * Guard: hanya pemilik notifikasi.
   */
  delete: async (notificationId: string, userId: string) => {
    await assertNotificationOwner(notificationId, userId);

    await prisma.notification.delete({ where: { notificationId } });
    return null;
  },
};
