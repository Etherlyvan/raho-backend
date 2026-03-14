import { z } from "zod";

export const createUserSchema = z.object({
  email:          z.string().email("Format email tidak valid"),
  password:       z.string().min(8, "Minimal 8 karakter")
                    .regex(/[A-Z]/, "Harus ada huruf kapital")
                    .regex(/[0-9]/, "Harus ada angka"),
  roleId:         z.string().min(1, "Role wajib dipilih"),
  branchId:       z.string().optional(),
  fullName:       z.string().min(1, "Nama lengkap wajib diisi"),
  phone:          z.string().optional(),
  jenisProfesi:   z.enum(["DOKTER", "NAKES"]).optional(),
  strNumber:      z.string().optional(),
  masaBerlakuStr: z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
  speciality:     z.string().optional(),
});

export const updateUserSchema = z.object({
  email:    z.string().email("Format email tidak valid").optional(),
  roleId:   z.string().optional(),
  branchId: z.string().nullable().optional(),
});

export const updateProfileSchema = z.object({
  fullName:       z.string().min(1, "Nama tidak boleh kosong").optional(),
  phone:          z.string().optional(),
  avatarUrl:      z.string().url("Format URL tidak valid").optional(),
  jenisProfesi:   z.enum(["DOKTER", "NAKES"]).optional(),
  strNumber:      z.string().optional(),
  masaBerlakuStr: z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
  speciality:     z.string().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Minimal 8 karakter")
                 .regex(/[A-Z]/, "Harus ada huruf kapital")
                 .regex(/[0-9]/, "Harus ada angka"),
});

// ✅ Query validation
export const userQuerySchema = z.object({
  roleId:   z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform((v) => v === undefined ? undefined : v === "true"),
  search:   z.string().optional(),
  page:     z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit:    z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export type CreateUserInput    = z.infer<typeof createUserSchema>;
export type UpdateUserInput    = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserQueryInput     = z.infer<typeof userQuerySchema>;
