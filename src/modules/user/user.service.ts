import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import {
  nextStaffSeq, formatStaffCode, needsStaffCode,  // ✅
} from "../../lib/sequences";
import {
  CreateUserInput, UpdateUserInput, UpdateProfileInput,
  ResetPasswordInput, UserQueryInput,
} from "./user.schema";
import { RoleName } from "../../generated/prisma";

const userSelect = {
  userId:    true,
  staffCode: true,
  email:     true,
  isActive:  true,
  createdAt: true,
  role:    { select: { roleId: true, name: true } },
  branch:  { select: { branchId: true, name: true, city: true } },
  profile: { select: { fullName: true, phone: true, avatarUrl: true, jenisProfesi: true, speciality: true } },
} as const;

export const userService = {
  create: async (data: CreateUserInput) => {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError("Email sudah digunakan", 409);

    const role = await prisma.role.findUnique({ where: { roleId: data.roleId } });
    if (!role) throw new AppError("Role tidak ditemukan", 404);

    // ✅ Deklarasi di function scope — accessible di dalam $transaction (closure)
    let branch: Awaited<ReturnType<typeof prisma.branch.findUnique>> | null = null;

    if (data.branchId) {
      branch = await prisma.branch.findUnique({ where: { branchId: data.branchId } });
      if (!branch)          throw new AppError("Cabang tidak ditemukan", 404);
      if (!branch.isActive) throw new AppError("Cabang tidak aktif", 400);
    }

    // Role yang butuh staffCode wajib punya cabang
    if (needsStaffCode(role.name) && !branch) {
      throw new AppError(`Role ${role.name} wajib memiliki cabang`, 400);
    }

    const {
      fullName, phone, jenisProfesi, strNumber,
      masaBerlakuStr, speciality, password, ...userData
    } = data;

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    return prisma.$transaction(async (tx) => {
      // ✅ branch accessible di sini karena closure menangkap outer scope
      let staffCode: string | undefined;
      if (needsStaffCode(role.name) && branch) {
        const seq = await nextStaffSeq(branch.branchCode, role.name);
        staffCode = formatStaffCode(role.name, branch.branchCode, seq);
      }

      return tx.user.create({
        data: {
          ...userData,
          passwordHash,
          staffCode,
          profile: {
            create: {
              fullName,
              phone,
              jenisProfesi,
              strNumber,
              masaBerlakuStr: masaBerlakuStr ? new Date(masaBerlakuStr) : undefined,
              speciality,
            },
          },
        },
        select: userSelect,
      });
    });
  },


  findAll: async (filters: UserQueryInput, requester: { role: RoleName; branchId: string | null }) => {
    const { roleId, branchId, isActive, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    // ✅ ADMIN hanya bisa lihat user di cabangnya sendiri
    const effectiveBranchId = requester.role === RoleName.ADMIN
      ? (requester.branchId ?? undefined)
      : branchId;

    const where = {
      roleId,
      branchId: effectiveBranchId,
      isActive,
      ...(search && {
        profile: {
          fullName: { contains: search, mode: "insensitive" as const },
        },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        select:  userSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  findById: async (userId: string, requester?: { role: RoleName; branchId: string | null }) => {
    const user = await prisma.user.findUnique({
      where:  { userId },
      select: {
        ...userSelect,
        updatedAt: true,
        role:    { select: { roleId: true, name: true, permissions: true } },
        branch:  { select: { branchId: true, name: true, city: true, isActive: true } },
        profile: true,
      },
    });
    if (!user) throw new AppError("User tidak ditemukan", 404);

    // ✅ ADMIN hanya bisa lihat user di cabangnya
    if (requester?.role === RoleName.ADMIN && user.branch?.branchId !== requester.branchId) {
      throw new AppError("Akses ditolak", 403);
    }

    return user;
  },

  update: async (userId: string, data: UpdateUserInput) => {
    await userService.findById(userId);

    if (data.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email: data.email, NOT: { userId } },
      });
      if (duplicate) throw new AppError("Email sudah digunakan", 409);
    }

    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { roleId: data.roleId } });
      if (!role) throw new AppError("Role tidak ditemukan", 404);
    }

    if (data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { branchId: data.branchId } });
      if (!branch) throw new AppError("Cabang tidak ditemukan", 404);
    }

    return prisma.user.update({ where: { userId }, data, select: userSelect });
  },

  toggleActive: async (userId: string, requesterId: string) => {
    if (userId === requesterId) throw new AppError("Tidak bisa menonaktifkan akun sendiri", 400);
    const user = await userService.findById(userId);
    return prisma.user.update({
      where:  { userId },
      data:   { isActive: !user.isActive },
      select: { userId: true, email: true, isActive: true, role: { select: { name: true } } },
    });
  },

  resetPassword: async (userId: string, data: ResetPasswordInput) => {
    await userService.findById(userId);
    const passwordHash = await bcrypt.hash(data.newPassword, env.BCRYPT_SALT_ROUNDS);
    await prisma.user.update({ where: { userId }, data: { passwordHash } });
    return null;
  },

  getProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where:  { userId },
      select: {
        userId: true, email: true, isActive: true, createdAt: true, updatedAt: true,
        role:    { select: { name: true, permissions: true } },
        branch:  { select: { branchId: true, name: true, city: true } },
        profile: true,
      },
    });
    if (!user) throw new AppError("User tidak ditemukan", 404);
    return user;
  },

  updateProfile: async (userId: string, data: UpdateProfileInput) => {
    await userService.findById(userId);

    const profileData = {
      ...data,
      masaBerlakuStr: data.masaBerlakuStr ? new Date(data.masaBerlakuStr) : undefined,
    };

    // ✅ Fix: cek apakah profile sudah ada, jika belum wajib ada fullName
    const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!existingProfile && !data.fullName) {
      throw new AppError("Nama lengkap wajib diisi untuk membuat profil baru", 400);
    }

    return prisma.userProfile.upsert({
      where:  { userId },
      update: profileData,
      create: { userId, fullName: data.fullName!, ...profileData },
    });
  },
};
