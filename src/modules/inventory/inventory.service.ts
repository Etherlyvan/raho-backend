import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  AddStockInput,
  CreateInventoryInput,
  InventoryQueryInput,
  UpdateInventoryInput,
} from './inventory.schema';

// ─── Selectors ───────────────────────────────────────────────────────────────

const inventorySelect = {
  inventoryItemId: true,
  name: true,
  category: true,
  unit: true,
  stock: true,
  minThreshold: true,
  location: true,
  isActive: true,
  partnershipId: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: { branchId: true, name: true, city: true, tipe: true },
  },
  partnership: {
    select: { partnershipId: true, name: true, city: true },
  },
  _count: {
    select: { usages: true, requests: true },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertItemExists(inventoryItemId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { inventoryItemId },
    select: inventorySelect,
  });
  if (!item) throw new AppError('Item inventori tidak ditemukan', 404);
  return item;
}

/**
 * Resolve branchId efektif berdasarkan role requester.
 * ADMIN, DOCTOR, NURSE → wajib di cabang mereka sendiri.
 * MASTER_ADMIN, SUPER_ADMIN → bisa filter by branchId opsional.
 */
function resolveEffectiveBranchId(
  requester: { role: RoleName; branchId: string | null },
  filterBranchId?: string,
): string | undefined {
  const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.DOCTOR, RoleName.NURSE];
  if (scopedRoles.includes(requester.role)) {
    return requester.branchId ?? undefined;
  }
  return filterBranchId;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const inventoryService = {
  /**
   * #77 — POST /api/inventory
   * Item dibuat di cabang requester (ADMIN) atau cabang yang ditentukan (MASTER_ADMIN/SUPER_ADMIN).
   * branchId diambil dari req.user — tidak boleh dikirim dari client.
   */
  create: async (
    data: CreateInventoryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    if (!requester.branchId) {
      throw new AppError('Akun ini tidak terikat ke cabang manapun', 400);
    }

    return prisma.inventoryItem.create({
      data: {
        branchId: requester.branchId,
        name: data.name,
        category: data.category,
        unit: data.unit,
        stock: data.stock,
        minThreshold: data.minThreshold,
        location: data.location ?? null,
        partnershipId: data.partnershipId ?? null,
      },
      select: inventorySelect,
    });
  },

  /**
   * #78 — GET /api/inventory
   * List stok dengan filter + search + pagination.
   * Scoping otomatis berdasarkan role.
   */
  findAll: async (
    filters: InventoryQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const { category, isActive, search, belowThreshold, page, limit } = filters;
    const skip = (page - 1) * limit;

    const effectiveBranchId = resolveEffectiveBranchId(requester, filters.branchId);

    const where: Prisma.InventoryItemWhereInput = {
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(category ? { category } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
      // Filter item di bawah minimum threshold
      ...(belowThreshold
        ? { stock: { lte: prisma.inventoryItem.fields.minThreshold } }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: inventorySelect,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * #79 — GET /api/inventory/:itemId
   */
  findById: async (inventoryItemId: string) =>
    assertItemExists(inventoryItemId),

  /**
   * #80 — PATCH /api/inventory/:itemId
   * Update metadata item (bukan stok — gunakan /add-stock untuk itu).
   */
  update: async (inventoryItemId: string, data: UpdateInventoryInput) => {
    await assertItemExists(inventoryItemId);

    return prisma.inventoryItem.update({
      where: { inventoryItemId },
      data,
      select: inventorySelect,
    });
  },

  /**
   * #81 — PATCH /api/inventory/:itemId/add-stock
   * Tambah stok secara atomic.
   * Juga bisa digunakan untuk koreksi stok manual oleh ADMIN.
   */
  addStock: async (inventoryItemId: string, data: AddStockInput) => {
    await assertItemExists(inventoryItemId);

    return prisma.inventoryItem.update({
      where: { inventoryItemId },
      data: {
        stock: { increment: data.amount },
      },
      select: inventorySelect,
    });
  },

  /**
   * #82 — DELETE /api/inventory/:itemId
   * Soft delete — set isActive = false.
   * Hard delete diblokir jika item memiliki riwayat pemakaian (usages > 0).
   */
  remove: async (inventoryItemId: string) => {
    const item = await prisma.inventoryItem.findUnique({
      where: { inventoryItemId },
      select: { inventoryItemId: true, _count: { select: { usages: true } } },
    });
    if (!item) throw new AppError('Item inventori tidak ditemukan', 404);

    if (item._count.usages > 0) {
      // Soft delete — item memiliki riwayat, tidak bisa dihapus permanen
      return prisma.inventoryItem.update({
        where: { inventoryItemId },
        data: { isActive: false },
        select: inventorySelect,
      });
    }

    // Hard delete — tidak ada riwayat pemakaian
    await prisma.inventoryItem.delete({ where: { inventoryItemId } });
    return null;
  },

  /**
   * #83 — GET /api/inventory/alerts
   * List item yang stoknya di bawah atau sama dengan minThreshold.
   * Diurutkan dari stok paling rendah.
   */
  findAlerts: async (requester: { role: RoleName; branchId: string | null }) => {
    const effectiveBranchId = resolveEffectiveBranchId(requester);

      // Prisma tidak support field comparison langsung (stock <= minThreshold)
      // Gunakan $queryRaw untuk efisiensi
      const alerts = await prisma.$queryRaw<Array<{
      inventoryItemId: string;
      name:            string;
      category:        string;
      unit:            string;
      stock:           number;
      minThreshold:    number;
      location:        string | null;
      branchId:        string;
    }>>`
      SELECT
        "inventory_item_id"  AS "inventoryItemId",
        "name",
        "category"::text,
        "unit",
        "stock",
        "min_threshold"      AS "minThreshold",
        "location",
        "branch_id"          AS "branchId"
      FROM "inventory_items"
      WHERE  "stock"      <= "min_threshold"
        AND  "is_active"   = true
        ${effectiveBranchId
          ? Prisma.sql`AND "branch_id" = ${effectiveBranchId}`
          : Prisma.empty}
      ORDER BY ("stock" - "min_threshold") ASC
    `;

    return {
      total: alerts.length,
      items: alerts,
    };
  },
};
