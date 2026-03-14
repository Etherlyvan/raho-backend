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
};
