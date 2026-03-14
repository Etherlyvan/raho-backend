import { z } from "zod";

export const createBranchSchema = z.object({
  name:           z.string().min(1, "Nama cabang wajib diisi"),
  address:        z.string().min(1, "Alamat wajib diisi"),
  city:           z.string().min(1, "Kota wajib diisi"),
  phone:          z.string().optional(),
  tipe:           z.enum(["KLINIK", "HOMECARE"]).default("KLINIK"),
  operatingHours: z.string().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

// ✅ Query validation
export const branchQuerySchema = z.object({
  isActive: z.enum(["true", "false"]).optional().transform((v) => v === undefined ? undefined : v === "true"),
  tipe:     z.enum(["KLINIK", "HOMECARE"]).optional(),
  page:     z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit:    z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type BranchQueryInput  = z.infer<typeof branchQuerySchema>;
