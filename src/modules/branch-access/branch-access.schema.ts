import { z } from "zod";

export const grantAccessSchema = z.object({
  memberNo: z.string().min(1, "Kode akun pasien wajib diisi"),
  branchId: z.string().min(1, "ID cabang wajib diisi"),
  notes:    z.string().optional(),
});

export type GrantAccessInput = z.infer<typeof grantAccessSchema>;
