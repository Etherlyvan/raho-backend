import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { GrantAccessInput } from "./branch-access.schema";

const accessInclude = {
  member: { select: { memberId: true, memberNo: true, fullName: true, status: true } },
  branch: { select: { branchId: true, name: true, city: true, tipe: true } },
  grantedByUser: {
    select: {
      userId:  true,
      profile: { select: { fullName: true } },
    },
  },
} as const;

export const branchAccessService = {
  grant: async (data: GrantAccessInput, grantedBy: string) => {
    const member = await prisma.member.findUnique({
      where: { memberNo: data.memberNo.toUpperCase() },
    });
    if (!member)                    throw new AppError("Pasien dengan kode akun tersebut tidak ditemukan", 404);
    if (member.status === "INACTIVE") throw new AppError("Akun pasien tidak aktif", 400);

    const branch = await prisma.branch.findUnique({ where: { branchId: data.branchId } });
    if (!branch)          throw new AppError("Cabang tidak ditemukan", 404);
    if (!branch.isActive) throw new AppError("Cabang tidak aktif", 400);

    // Tidak bisa grant akses ke cabang registrasi sendiri (sudah punya akses by default)
    if (member.registrationBranchId === data.branchId) {
      throw new AppError("Cabang ini adalah cabang registrasi pasien, akses sudah tersedia", 400);
    }

    const existing = await prisma.branchMemberAccess.findUnique({
      where: { memberId_branchId: { memberId: member.memberId, branchId: data.branchId } },
    });

    if (existing?.isActive) throw new AppError("Cabang sudah memiliki akses ke pasien ini", 409);

    // Jika sebelumnya pernah dicabut, reaktifkan
    if (existing) {
      return prisma.branchMemberAccess.update({
        where:   { accessId: existing.accessId },
        data:    { isActive: true, grantedBy, notes: data.notes, grantedAt: new Date() },
        include: accessInclude,
      });
    }

    return prisma.branchMemberAccess.create({
      data: {
        memberId:  member.memberId,
        branchId:  data.branchId,
        grantedBy,
        notes:     data.notes,
      },
      include: accessInclude,
    });
  },

  findByMember: async (memberId: string) => {
    const member = await prisma.member.findUnique({ where: { memberId } });
    if (!member) throw new AppError("Pasien tidak ditemukan", 404);

    return prisma.branchMemberAccess.findMany({
      where:   { memberId },
      orderBy: { grantedAt: "desc" },
      include: accessInclude,
    });
  },

  revoke: async (accessId: string) => {
    const access = await prisma.branchMemberAccess.findUnique({ where: { accessId } });
    if (!access)          throw new AppError("Data akses tidak ditemukan", 404);
    if (!access.isActive) throw new AppError("Akses ini sudah dicabut sebelumnya", 400);

    return prisma.branchMemberAccess.update({
      where:   { accessId },
      data:    { isActive: false },
      include: accessInclude,
    });
  },
};
