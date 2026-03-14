import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { nextBranchSeq, formatBranchCode } from "../../lib/sequences"; // ✅
import { CreateBranchInput, UpdateBranchInput, BranchQueryInput } from "./branch.schema";

const branchInclude = {
  _count: {
    select: {
      users:             true,
      registeredMembers: true,
      encounters:        true,
      inventory:         true,
    },
  },
} as const;

export const branchService = {
  create: async (data: CreateBranchInput) => {
    return prisma.$transaction(async (tx) => {
      // ✅ Generate branchCode atomic di dalam transaction
      const seq        = await nextBranchSeq();
      const branchCode = formatBranchCode(seq);

      return tx.branch.create({
        data:    { ...data, branchCode },
        include: branchInclude,
      });
    });
  },

  findAll: async (filters: BranchQueryInput) => {
    const { isActive, tipe, page, limit } = filters;
    const skip  = (page - 1) * limit;
    const where = { isActive, tipe };

    const [data, total] = await prisma.$transaction([
      prisma.branch.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        include: branchInclude,
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  findById: async (branchId: string) => {
    const branch = await prisma.branch.findUnique({
      where:   { branchId },
      include: branchInclude,
    });
    if (!branch) throw new AppError("Cabang tidak ditemukan", 404);
    return branch;
  },

  update: async (branchId: string, data: UpdateBranchInput) => {
    await branchService.findById(branchId);
    return prisma.branch.update({ where: { branchId }, data });
  },

  toggleActive: async (branchId: string) => {
    const branch = await branchService.findById(branchId);
    return prisma.branch.update({
      where:   { branchId },
      data:    { isActive: !branch.isActive },
      include: branchInclude,
    });
  },
  stats: async (branchId: string) => {
  const branch = await branchService.findById(branchId);

  const { start: todayStart, end: todayEnd } = (() => {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  })();

  const { start: monthStart, end: monthEnd } = (() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  })();

  const [
    totalMembers,
    activePackages,
    todaySessions,
    monthSessions,
    monthRevenue,
    activeStaff,
  ] = await prisma.$transaction([
    prisma.member.count({ where: { registrationBranchId: branchId, status: 'ACTIVE' } }),
    prisma.memberPackage.count({ where: { branchId, status: 'ACTIVE' } }),
    prisma.treatmentSession.count({
      where: {
        encounter: { branchId },
        treatmentDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
    }),
    prisma.treatmentSession.count({
      where: {
        encounter: { branchId },
        treatmentDate: { gte: monthStart, lte: monthEnd },
        status: 'COMPLETED',
      },
    }),
    prisma.invoice.aggregate({
      where: {
        session: { encounter: { branchId } },
        status: 'PAID',
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: { branchId, isActive: true },
    }),
  ]);

  const branchStockAlertResult = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(*)::int AS count
    FROM inventory_items
    WHERE branch_id = ${branchId}
      AND is_active  = true
      AND stock <= min_threshold
  `;
  const branchStockAlertCount = branchStockAlertResult[0]?.count ?? 0;


  return {
    branch: {
      branchId: branch.branchId,
      name: branch.name,
      city: branch.city,
      tipe: branch.tipe,
    },
    stats: {
      totalActiveMembers:  totalMembers,
      activePackages,
      todaySessions,
      monthCompletedSessions: monthSessions,
      monthRevenue: monthRevenue._sum.amount ?? 0,
      criticalStockCount:     branchStockAlertCount,
      activeStaff,
    },
  };
},
};
