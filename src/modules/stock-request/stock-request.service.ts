import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  CreateStockRequestInput,
  FulfillStockRequestInput,
  RejectStockRequestInput,
  StockRequestQueryInput,
} from './stock-request.schema';

// ─── Selector ────────────────────────────────────────────────────────────────

const stockRequestSelect = {
  stockRequestId: true,
  quantity: true,
  reason: true,
  status: true,
  createdAt: true,
  item: {
    select: {
      inventoryItemId: true,
      name: true,
      category: true,
      unit: true,
      stock: true,
      minThreshold: true,
      branch: { select: { branchId: true, name: true, city: true } },
    },
  },
  requester: {
    select: {
      userId: true,
      staffCode: true,
      role: { select: { name: true } },
      profile: { select: { fullName: true } },
    },
  },
} as const;

async function assertRequestExists(stockRequestId: string) {
  const req = await prisma.stockRequest.findUnique({
    where: { stockRequestId },
    select: stockRequestSelect,
  });
  if (!req) throw new AppError('Permintaan stok tidak ditemukan', 404);
  return req;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const stockRequestService = {
  /**
   * #84 — POST /api/stock-requests
   * Perawat atau Admin mengajukan permintaan penambahan stok.
   * Item harus aktif dan berada di cabang yang sama dengan requester.
   */
  create: async (
    data: CreateStockRequestInput,
    requestBy: string,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const item = await prisma.inventoryItem.findUnique({
      where: { inventoryItemId: data.inventoryItemId },
      select: { inventoryItemId: true, branchId: true, isActive: true, name: true },
    });
    if (!item) throw new AppError('Item inventori tidak ditemukan', 404);
    if (!item.isActive) throw new AppError('Item inventori tidak aktif', 400);

    // Nurse dan Admin hanya bisa request untuk item di cabangnya
    const scopedRoles: RoleName[] = [RoleName.NURSE, RoleName.ADMIN];
    if (
      scopedRoles.includes(requester.role) &&
      requester.branchId &&
      item.branchId !== requester.branchId
    ) {
      throw new AppError('Item ini tidak berada di cabang Anda', 403);
    }

    return prisma.stockRequest.create({
      data: {
        inventoryItemId: data.inventoryItemId,
        requestBy,
        quantity: data.quantity,
        reason: data.reason ?? null,
        status: 'PENDING',
      },
      select: stockRequestSelect,
    });
  },

  /**
   * #85 — GET /api/stock-requests
   * Scoping: NURSE & ADMIN hanya melihat request item di cabangnya.
   */
  findAll: async (
    filters: StockRequestQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const { inventoryItemId, status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const scopedRoles: RoleName[] = [RoleName.NURSE, RoleName.ADMIN];
    const effectiveBranchId = scopedRoles.includes(requester.role)
      ? (requester.branchId ?? undefined)
      : (filters.branchId ?? undefined);

    const where: Prisma.StockRequestWhereInput = {
      ...(inventoryItemId ? { inventoryItemId } : {}),
      ...(status ? { status } : {}),
      ...(effectiveBranchId
        ? { item: { branchId: effectiveBranchId } }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.stockRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: stockRequestSelect,
      }),
      prisma.stockRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * #86 — PATCH /api/stock-requests/:requestId/approve
   * Hanya ADMIN ke atas yang bisa approve.
   * Status harus PENDING.
   */
  approve: async (stockRequestId: string) => {
    const request = await assertRequestExists(stockRequestId);

    if (request.status !== 'PENDING') {
      throw new AppError(
        `Permintaan tidak dapat di-approve, status saat ini: ${request.status}`,
        400,
      );
    }

    return prisma.stockRequest.update({
      where: { stockRequestId },
      data: { status: 'APPROVED' },
      select: stockRequestSelect,
    });
  },

  /**
   * #87 — PATCH /api/stock-requests/:requestId/reject
   * Hanya ADMIN ke atas yang bisa reject.
   * Status harus PENDING atau APPROVED.
   * Alasan penolakan wajib diisi.
   */
  reject: async (stockRequestId: string, data: RejectStockRequestInput) => {
    const request = await assertRequestExists(stockRequestId);

    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      throw new AppError(
        `Permintaan tidak dapat ditolak, status saat ini: ${request.status}`,
        400,
      );
    }

    return prisma.stockRequest.update({
      where: { stockRequestId },
      data: {
        status: 'REJECTED',
        reason: `[REJECTED] ${data.reason}`,
      },
      select: stockRequestSelect,
    });
  },

  /**
   * #88 — PATCH /api/stock-requests/:requestId/fulfill
   * Tandai permintaan sebagai terpenuhi + tambah stok secara atomic.
   * Status harus APPROVED.
   * Jika actualQuantity tidak diisi, gunakan quantity yang diminta.
   */
  fulfill: async (stockRequestId: string, data: FulfillStockRequestInput) => {
    const request = await assertRequestExists(stockRequestId);

    if (request.status !== 'APPROVED') {
      throw new AppError(
        `Permintaan hanya bisa dipenuhi setelah di-approve, status saat ini: ${request.status}`,
        400,
      );
    }

    const amountToAdd = data.actualQuantity ?? request.quantity;
    const notes = data.notes
      ? `[FULFILLED] Aktual: ${amountToAdd}. ${data.notes}`
      : `[FULFILLED] Aktual: ${amountToAdd}`;

    return prisma.$transaction(async (tx) => {
      // 1. Update status request
      const fulfilled = await tx.stockRequest.update({
        where: { stockRequestId },
        data: {
          status: 'FULFILLED',
          reason: request.reason
            ? `${request.reason} | ${notes}`
            : notes,
        },
        select: stockRequestSelect,
      });

      // 2. Tambah stok item secara atomic
      await tx.inventoryItem.update({
        where: { inventoryItemId: request.item.inventoryItemId },
        data: { stock: { increment: amountToAdd } },
      });

      return fulfilled;
    });
  },
};
