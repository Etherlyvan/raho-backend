import { Prisma } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AuditLogQueryInput } from './audit-log.schema';

const auditLogSelect = {
  auditLogId: true,
  action: true,
  resource: true,
  resourceId: true,
  meta: true,
  createdAt: true,
  user: {
    select: {
      userId: true,
      staffCode: true,
      email: true,
      role: { select: { name: true } },
      branch: { select: { name: true, city: true } },
      profile: { select: { fullName: true } },
    },
  },
} as const;

export const auditLogService = {
  /**
   * #113 — GET /api/audit-logs
   * Log semua aktivitas sistem dengan filter user, action, resource, dan tanggal.
   */
  findAll: async (filters: AuditLogQueryInput) => {
    const { userId, action, resource, dateFrom, dateTo, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(resource ? { resource: { contains: resource, mode: 'insensitive' as const } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: auditLogSelect,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },
};
