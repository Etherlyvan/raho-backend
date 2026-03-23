import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  InvoiceQueryInput,
  PayInvoiceInput,
  RejectInvoiceInput,
  UpdateInvoiceInput,
} from './invoice.schema';

// ─── Selectors ───────────────────────────────────────────────────────────────

const invoiceSelect = {
  invoiceId: true,
  amount: true,
  status: true,
  items: true,
  notes: true,
  paidAt: true,
  verifiedBy: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      memberId: true,
      memberNo: true,
      fullName: true,
      phone: true,
    },
  },
  session: {
    select: {
      treatmentSessionId: true,
      infusKe: true,
      treatmentDate: true,
      completedAt: true,
      pelaksanaan: true,
      encounter: {
        select: {
          encounterId: true,
          type: true,
          branch: { select: { branchId: true, name: true, city: true } },
          memberPackage: {
            select: {
              packageType: true,
              packageName: true,
            },
          },
        },
      },
    },
  },
  verifiedByUser: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertInvoiceExists(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
    select: invoiceSelect,
  });
  if (!invoice) throw new AppError('Invoice tidak ditemukan', 404);
  return invoice;
}

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

export const invoiceService = {
  /**
   * #89 — GET /api/invoices
   * List invoice dengan filter status, member, cabang, dan rentang tanggal.
   * Scoping: ADMIN/DOCTOR/NURSE hanya melihat invoice di cabangnya.
   */
  findAll: async (
    filters: InvoiceQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const { status, memberId, dateFrom, dateTo, page, limit } = filters;
    const skip = (page - 1) * limit;

    const effectiveBranchId = resolveEffectiveBranchId(requester, filters.branchId);

    const where: Prisma.InvoiceWhereInput = {
      ...(status ? { status } : {}),
      ...(memberId ? { memberId } : {}),
      ...(effectiveBranchId
        ? { session: { encounter: { branchId: effectiveBranchId } } }
        : {}),
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
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: invoiceSelect,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Hitung total amount untuk filter aktif
    const totalAmount = await prisma.invoice.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalAmount._sum.amount ?? 0,
      },
    };
  },

  /**
   * #90 — GET /api/invoices/:invoiceId
   * Detail invoice lengkap beserta data sesi dan encounter.
   */
  findById: async (
    invoiceId: string,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const invoice = await assertInvoiceExists(invoiceId);

    // Branch scoping
    const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.DOCTOR, RoleName.NURSE];
    if (
      scopedRoles.includes(requester.role) &&
      requester.branchId &&
      invoice.session.encounter.branch.branchId !== requester.branchId
    ) {
      throw new AppError('Anda tidak memiliki akses ke invoice ini', 403);
    }

    return invoice;
  },

  /**
   * #91 — PATCH /api/invoices/:invoiceId/pay
   * Tandai invoice sudah dibayar.
   * Hanya bisa dilakukan saat status PENDING atau OVERDUE.
   * paidAt default ke now() jika tidak diisi.
   */
  pay: async (invoiceId: string, data: PayInvoiceInput) => {
    const invoice = await assertInvoiceExists(invoiceId);

    if (!['PENDING', 'OVERDUE'].includes(invoice.status)) {
      throw new AppError(
        `Invoice tidak dapat ditandai lunas, status saat ini: ${invoice.status}`,
        400,
      );
    }

    return prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: 'PAID',
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes ?? invoice.notes,
      },
      select: invoiceSelect,
    });
  },

  /**
   * #92 — PATCH /api/invoices/:invoiceId/verify
   * Admin memverifikasi pembayaran yang sudah PAID.
   * Mengisi verifiedBy dengan userId admin.
   * Status tetap PAID — verify hanya menambahkan tanda tangan admin.
   */
  verify: async (invoiceId: string, verifiedBy: string) => {
    const invoice = await assertInvoiceExists(invoiceId);

    if (invoice.status !== 'PAID') {
      throw new AppError(
        `Invoice hanya bisa diverifikasi setelah berstatus PAID, status saat ini: ${invoice.status}`,
        400,
      );
    }

    if (invoice.verifiedBy) {
      throw new AppError('Invoice ini sudah diverifikasi sebelumnya', 409);
    }

    return prisma.invoice.update({
      where: { invoiceId },
      data: { verifiedBy },
      select: invoiceSelect,
    });
  },

  /**
   * #93 — PATCH /api/invoices/:invoiceId/reject
   * Tolak invoice (misal: tagihan tidak sesuai, perlu koreksi).
   * Hanya bisa dari status PENDING atau OVERDUE.
   * Alasan penolakan disimpan di notes dengan prefix [REJECTED].
   */
  reject: async (invoiceId: string, data: RejectInvoiceInput) => {
    const invoice = await assertInvoiceExists(invoiceId);

    if (!['PENDING', 'OVERDUE'].includes(invoice.status)) {
      throw new AppError(
        `Invoice tidak dapat ditolak, status saat ini: ${invoice.status}`,
        400,
      );
    }

    return prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: 'REJECTED',
        notes: `[REJECTED] ${data.reason}`,
      },
      select: invoiceSelect,
    });
  },

  /**
   * #94 — PATCH /api/invoices/:invoiceId (Update)
   * Koreksi jumlah atau item invoice.
   * Hanya bisa dilakukan saat status PENDING.
   * Berguna jika ada kesalahan input saat sesi complete.
   */
  update: async (invoiceId: string, data: UpdateInvoiceInput) => {
    const invoice = await assertInvoiceExists(invoiceId);

    if (invoice.status !== 'PENDING') {
      throw new AppError(
        `Invoice hanya bisa dikoreksi saat status PENDING, status saat ini: ${invoice.status}`,
        400,
      );
    }

    return prisma.invoice.update({
      where: { invoiceId },
      data: {
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.items !== undefined
          ? { items: data.items as Prisma.InputJsonValue }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      select: invoiceSelect,
    });
  },

  /**
   * #89b — GET /api/members/:memberId/invoices
   * Riwayat invoice pasien tertentu.
   * Di-mount di member.routes.ts bukan di invoice.routes.ts.
   */
  findByMember: async (
    memberId: string,
    filters: InvoiceQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const member = await prisma.member.findUnique({
      where: { memberId },
      select: { memberId: true, fullName: true },
    });
    if (!member) throw new AppError('Pasien tidak ditemukan', 404);

    const { status, dateFrom, dateTo, page, limit } = filters;
    const skip = (page - 1) * limit;

    const effectiveBranchId = resolveEffectiveBranchId(requester, filters.branchId);

    const where: Prisma.InvoiceWhereInput = {
      memberId,
      ...(status ? { status } : {}),
      ...(effectiveBranchId
        ? { session: { encounter: { branchId: effectiveBranchId } } }
        : {}),
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
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: invoiceSelect,
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalAmount = await prisma.invoice.aggregate({
      where,
      _sum: { amount: true },
    });

    const paidAmount = await prisma.invoice.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
    });

    return {
      member,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalAmount._sum.amount ?? 0,
        paidAmount: paidAmount._sum.amount ?? 0,
        pendingAmount:
          (totalAmount._sum.amount ?? 0) - (paidAmount._sum.amount ?? 0),
      },
    };
  },
};
