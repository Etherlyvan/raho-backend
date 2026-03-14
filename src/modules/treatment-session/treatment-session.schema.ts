import { z } from 'zod';

// ─── Request Schemas ─────────────────────────────────────────────────────────

export const createTreatmentSessionSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID wajib diisi'),
  nurseId: z.string().optional(),
  pelaksanaan: z.enum(['KLINIK', 'HOMECARE'], {
    errorMap: () => ({ message: 'Pelaksanaan harus KLINIK atau HOMECARE' }),
  }).optional(),
  boosterPackageId: z.string().optional(),
  treatmentDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' }),
  nextTreatmentDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
  keluhanSebelum: z.string().optional(),
});

export const sessionQuerySchema = z.object({
  encounterId: z.string().optional(),
  nurseId: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export const updateSessionSchema = z.object({
  nurseId: z.string().optional(),
  pelaksanaan: z.enum(['KLINIK', 'HOMECARE']).optional(),
  keluhanSebelum: z.string().optional(),
  keluhanSesudah: z.string().optional(),
  berhasilInfus: z.boolean().optional(),
  healingCrisis: z.string().optional(),
  nextTreatmentDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
});

export const completeSessionSchema = z.object({
  keluhanSesudah: z.string().optional(),
  berhasilInfus: z.boolean().optional(),
  healingCrisis: z.string().optional(),
  invoiceAmount: z.number().positive('Jumlah invoice harus lebih dari 0'),
  invoiceItems: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama item wajib diisi'),
        quantity: z.number().positive(),
        price: z.number().nonnegative(),
      }),
    )
    .min(1, 'Invoice harus memiliki minimal 1 item'),
  invoiceNotes: z.string().optional(),
});

export const postponeSessionSchema = z.object({
  reason: z.string().min(1, 'Alasan penundaan wajib diisi'),
  newTreatmentDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
});
// ─── Exported Types ──────────────────────────────────────────────────────────

export type CreateTreatmentSessionInput = z.infer<typeof createTreatmentSessionSchema>;
export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type PostponeSessionInput = z.infer<typeof postponeSessionSchema>;