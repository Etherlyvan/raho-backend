import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateMaterialUsageInput } from './material-usage.schema';

const materialUsageSelect = {
  materialUsageId: true,
  treatmentSessionId: true,
  quantity: true,
  unit: true,
  createdAt: true,
  item: {
    select: {
      inventoryItemId: true,
      name: true,
      category: true,
      unit: true,
      stock: true,
    },
  },
  inputByUser: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
} as const;

async function assertInProgressSession(treatmentSessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId },
    select: { treatmentSessionId: true, status: true },
  });
  if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
  return session;
}

export const materialUsageService = {
  /**
   * #61 — POST /:sessionId/material-usages
   * Stok inventori otomatis berkurang.
   * Bergantung pada Sprint 8 (Inventori) untuk data item.
   */
  create: async (
    treatmentSessionId: string,
    data: CreateMaterialUsageInput,
    inputBy: string,
  ) => {
    const session = await assertInProgressSession(treatmentSessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        `Pemakaian bahan hanya dapat diinput saat sesi IN_PROGRESS, status saat ini: ${session.status}`,
        400,
      );
    }

    // Validasi item inventori & stok
    const item = await prisma.inventoryItem.findUnique({
      where: { inventoryItemId: data.inventoryItemId },
      select: { inventoryItemId: true, name: true, stock: true, isActive: true },
    });
    if (!item) throw new AppError('Item inventori tidak ditemukan', 404);
    if (!item.isActive) throw new AppError('Item inventori tidak aktif', 400);
    if (item.stock < data.quantity) {
      throw new AppError(
        `Stok tidak mencukupi. Stok tersedia: ${item.stock}, dibutuhkan: ${data.quantity}`,
        400,
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Catat pemakaian
      const usage = await tx.materialUsage.create({
        data: { treatmentSessionId, inputBy, ...data },
        select: materialUsageSelect,
      });

      // 2. Kurangi stok
      await tx.inventoryItem.update({
        where: { inventoryItemId: data.inventoryItemId },
        data: { stock: { decrement: data.quantity } },
      });

      return usage;
    });
  },

  /**
   * #62 — GET /:sessionId/material-usages
   */
  findAll: async (treatmentSessionId: string) => {
    await assertInProgressSession(treatmentSessionId);

    return prisma.materialUsage.findMany({
      where: { treatmentSessionId },
      orderBy: { createdAt: 'asc' },
      select: materialUsageSelect,
    });
  },

  /**
   * #63 — DELETE /:sessionId/material-usages/:muId
   * Stok dikembalikan saat record dihapus.
   */
  remove: async (treatmentSessionId: string, materialUsageId: string): Promise<void> => {
    const session = await assertInProgressSession(treatmentSessionId);

    if (session.status === 'COMPLETED') {
      throw new AppError('Tidak dapat menghapus pemakaian bahan pada sesi yang sudah selesai', 400);
    }

    const usage = await prisma.materialUsage.findFirst({
      where: { materialUsageId, treatmentSessionId },
      select: { materialUsageId: true, inventoryItemId: true, quantity: true },
    });
    if (!usage) throw new AppError('Data pemakaian bahan tidak ditemukan', 404);

    await prisma.$transaction(async (tx) => {
      // 1. Hapus record
      await tx.materialUsage.delete({ where: { materialUsageId } });

      // 2. Kembalikan stok
      await tx.inventoryItem.update({
        where: { inventoryItemId: usage.inventoryItemId },
        data: { stock: { increment: usage.quantity } },
      });
    });
  },
};
