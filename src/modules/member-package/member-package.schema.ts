import { z } from "zod";

export const createPackageSchema = z.object({
  packageType:   z.enum(["BASIC", "BOOSTER"], {
    errorMap: () => ({ message: "Tipe paket harus BASIC atau BOOSTER" }),
  }),
  branchId:      z.string().min(1, "ID cabang wajib diisi"),
  packageName:   z.string().optional(),
  totalSessions: z.number().int().positive("Jumlah sesi harus lebih dari 0"),
  price:         z.number().positive("Harga harus lebih dari 0"),
  expiredAt:     z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
  notes:         z.string().optional(),
});

// ✅ FIX: hapus verifiedBy — diambil dari req.user di controller
export const confirmPaymentSchema = z.object({
  notes: z.string().optional(),
});

export const cancelPackageSchema = z.object({
  reason: z.string().min(1, "Alasan pembatalan wajib diisi"),
});

export const activePackageQuerySchema = z.object({
  branchId: z.string().min(1, "ID cabang wajib diisi"),
});

export type CreatePackageInput      = z.infer<typeof createPackageSchema>;
export type ConfirmPaymentInput     = z.infer<typeof confirmPaymentSchema>;
export type CancelPackageInput      = z.infer<typeof cancelPackageSchema>;
export type ActivePackageQueryInput = z.infer<typeof activePackageQuerySchema>;
