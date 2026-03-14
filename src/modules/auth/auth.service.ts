import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { LoginInput, ChangePasswordInput } from "./auth.schema";

export const authService = {
  login: async (data: LoginInput) => {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        role:    true,
        branch:  { select: { branchId: true, name: true } },
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });

    if (!user)           throw new AppError("Email atau password salah", 401);
    if (!user.isActive)  throw new AppError("Akun tidak aktif. Hubungi administrator", 403);

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) throw new AppError("Email atau password salah", 401);

    const jwtPayload = {
      userId:   user.userId,
      email:    user.email,
      role:     user.role.name,
      branchId: user.branchId,
    };

    const accessToken  = jwt.sign(jwtPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = jwt.sign(
      { userId: user.userId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return {
      accessToken,
      refreshToken,   // controller akan set ini sebagai httpOnly cookie
      expiresIn: env.JWT_EXPIRES_IN,
      user: {
        userId:   user.userId,
        email:    user.email,
        role:     user.role.name,
        branchId: user.branchId,
        fullName: user.profile?.fullName ?? null,
        avatar:   user.profile?.avatarUrl ?? null,
      },
    };
  },

  getMe: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId:    true,
        email:     true,
        isActive:  true,
        createdAt: true,
        role:    { select: { name: true, permissions: true } },
        branch:  { select: { branchId: true, name: true, city: true } },
        profile: { select: { fullName: true, phone: true, avatarUrl: true, jenisProfesi: true, strNumber: true, speciality: true } },
      },
    });
    if (!user) throw new AppError("User tidak ditemukan", 404);
    return user;
  },

  refreshToken: async (token: string) => {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where:   { userId: payload.userId },
        include: { role: true },
      });
      if (!user || !user.isActive) throw new AppError("User tidak valid atau tidak aktif", 401);

      const jwtPayload = {
        userId:   user.userId,
        email:    user.email,
        role:     user.role.name,
        branchId: user.branchId,
      };

      const newAccessToken  = jwt.sign(jwtPayload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      });
      const newRefreshToken = jwt.sign(
        { userId: user.userId },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
      );

      return {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken, // rotate refresh token
        expiresIn:    env.JWT_EXPIRES_IN,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Refresh token tidak valid atau sudah expired", 401);
    }
  },

  changePassword: async (userId: string, data: ChangePasswordInput) => {
    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) throw new AppError("User tidak ditemukan", 404);

    const isCurrentCorrect = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isCurrentCorrect) throw new AppError("Password lama tidak benar", 401);

    const isSameAsOld = await bcrypt.compare(data.newPassword, user.passwordHash);
    if (isSameAsOld) throw new AppError("Password baru tidak boleh sama dengan password lama", 400);

    const newHash = await bcrypt.hash(data.newPassword, env.BCRYPT_SALT_ROUNDS);
    await prisma.user.update({ where: { userId }, data: { passwordHash: newHash } });

    return null;
  },
};
