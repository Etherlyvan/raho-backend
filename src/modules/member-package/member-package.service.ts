import { Prisma } from "../../generated/prisma";
import { RoleName } from "../../generated/prisma";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  CreatePackageInput,
  ConfirmPaymentInput,
  CancelPackageInput,
  ActivePackageQueryInput,
} from "./member-package.schema";

// ─── Selector ────────────────────────────────────────────────

const packageSelect = {
  memberPackageId: true,
  packageType:     true,
  packageName:     true,
  status:          true,
  totalSessions:   true,
  usedSessions:    true,
  price:           true,
  paidAt:          true,
  verifiedBy:      true,
  verifiedAt:      true,
  activatedAt:     true,
  expiredAt:       true,
  notes:           true,
  createdAt:       true,
  updatedAt:       true,
  member: {
    select: {
      memberId: true,
      memberNo: true,
      fullName: true,
      status:   true,
    },
  },
  branch: {
    select: {
      branchId:   true,
      branchCode: true,
      name:       true,
      city:       true,
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────

async function assertMemberActive(memberId: string): Promise<void> {
  const member = await prisma.member.findUnique({
    where:  { memberId },
    select: { memberId: true, status: true },
  });
  if (!member)                    throw new AppError("Pasien tidak ditemukan", 404);
  if (member.status !== "ACTIVE") throw new AppError("Akun pasien tidak aktif", 400);
}

async function assertBranchActive(branchId: string): Promise<void> {
  const branch = await prisma.branch.findUnique({
    where:  { branchId },
    select: { branchId: true, isActive: true },
  });
  if (!branch)          throw new AppError("Cabang tidak ditemukan", 404);
  if (!branch.isActive) throw new AppError("Cabang tidak aktif", 400);
}

async function assertPackageExists(memberPackageId: string, memberId: string) {
  const pkg = await prisma.memberPackage.findFirst({
    where:  { memberPackageId, memberId },
    select: {
      memberPackageId: true,
      status:          true,
      usedSessions:    true,
      totalSessions:   true,
      packageType:     true,
    },
  });
  if (!pkg) throw new AppError("Paket tidak ditemukan atau bukan milik pasien ini", 404);
  return pkg;
}

// ─── Service ─────────────────────────────────────────────────

export const memberPackageService = {

  create: async (memberId: string, data: CreatePackageInput, createdBy: string) => {
    await assertMemberActive(memberId);
    await assertBranchActive(data.branchId);

    // Cek paket ACTIVE atau PENDING_PAYMENT di cabang yang sama
    const existingActive = await prisma.memberPackage.findFirst({
      where: {
        memberId,
        branchId: data.branchId,
        status:   { in: ["ACTIVE", "PENDING_PAYMENT"] },
      },
      select: { status: true },
    });

    if (existingActive) {
      throw new AppError(
        `Pasien sudah memiliki paket ${
          existingActive.status === "ACTIVE" ? "aktif" : "menunggu pembayaran"
        } di cabang ini`,
        409
      );
    }

    const packageData: Prisma.MemberPackageUncheckedCreateInput = {
      memberId,
      branchId:      data.branchId,
      packageType:   data.packageType,
      packageName:   data.packageName,
      totalSessions: data.totalSessions,
      usedSessions:  0,
      price:         data.price,
      expiredAt:     data.expiredAt ? new Date(data.expiredAt) : undefined,
      notes:         data.notes,
      status:        "PENDING_PAYMENT",
    };

    return prisma.memberPackage.create({
      data:   packageData,
      select: packageSelect,
    });
  },

  findAll: async (memberId: string) => {
    const member = await prisma.member.findUnique({ where: { memberId } });
    if (!member) throw new AppError("Pasien tidak ditemukan", 404);

    return prisma.memberPackage.findMany({
      where:   { memberId },
      orderBy: { createdAt: "desc" },
      select:  packageSelect,
    });
  },

  findActive: async (memberId: string, query: ActivePackageQueryInput) => {
    const member = await prisma.member.findUnique({ where: { memberId } });
    if (!member) throw new AppError("Pasien tidak ditemukan", 404);

    await assertBranchActive(query.branchId);

    const pkg = await prisma.memberPackage.findFirst({
      where: {
        memberId,
        branchId: query.branchId,
        status:   "ACTIVE",
        OR: [
          { expiredAt: null },
          { expiredAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select:  packageSelect,
    });

    if (!pkg) {
      throw new AppError("Tidak ada paket aktif untuk pasien ini di cabang tersebut", 404);
    }

    return {
      ...pkg,
      remainingSessions: pkg.totalSessions - pkg.usedSessions,
    };
  },

  findById: async (memberId: string, memberPackageId: string) => {
    const pkg = await prisma.memberPackage.findFirst({
      where:  { memberPackageId, memberId },
      select: packageSelect,
    });
    if (!pkg) throw new AppError("Paket tidak ditemukan atau bukan milik pasien ini", 404);

    return {
      ...pkg,
      remainingSessions: pkg.totalSessions - pkg.usedSessions,
    };
  },

  confirmPayment: async (
    memberId:        string,
    memberPackageId: string,
    data:            ConfirmPaymentInput,
    confirmedById:   string
  ) => {
    const pkg = await assertPackageExists(memberPackageId, memberId);

    if (pkg.status !== "PENDING_PAYMENT") {
      const statusMsg: Record<string, string> = {
        ACTIVE:    "sudah aktif",
        CANCELLED: "sudah dibatalkan",
        EXPIRED:   "sudah kedaluwarsa",
        COMPLETED: "sudah selesai",
      };
      throw new AppError(
        `Paket tidak bisa dikonfirmasi — paket ${statusMsg[pkg.status] ?? "tidak valid"}`,
        400
      );
    }

    const updateData: Prisma.MemberPackageUncheckedUpdateInput = {
      status:      "ACTIVE",
      paidAt:      new Date(),
      verifiedBy:  confirmedById,
      verifiedAt:  new Date(),
      activatedAt: new Date(),
      notes:       data.notes,
    };

    return prisma.memberPackage.update({
      where:  { memberPackageId },
      data:   updateData,
      select: packageSelect,
    });
  },

  cancel: async (
    memberId:        string,
    memberPackageId: string,
    data:            CancelPackageInput,
    cancelledById:   string
  ) => {
    const pkg = await assertPackageExists(memberPackageId, memberId);

    if (pkg.usedSessions > 0) {
      throw new AppError(
        `Paket tidak bisa dibatalkan — sudah ada ${pkg.usedSessions} sesi yang digunakan`,
        400
      );
    }

    const cancellableStatuses = ["PENDING_PAYMENT", "ACTIVE"];
    if (!cancellableStatuses.includes(pkg.status)) {
      const statusMsg: Record<string, string> = {
        CANCELLED: "sudah dibatalkan sebelumnya",
        EXPIRED:   "sudah kedaluwarsa",
        COMPLETED: "sudah selesai",
      };
      throw new AppError(
        `Paket tidak bisa dibatalkan — ${statusMsg[pkg.status] ?? "status tidak valid"}`,
        400
      );
    }

    // ✅ Simpan alasan pembatalan ke field notes
    const updateData: Prisma.MemberPackageUncheckedUpdateInput = {
      status: "CANCELLED",
      notes:  `[CANCELLED by ${cancelledById}] ${data.reason}`,
    };

    return prisma.memberPackage.update({
      where:  { memberPackageId },
      data:   updateData,
      select: packageSelect,
    });
  },
};
