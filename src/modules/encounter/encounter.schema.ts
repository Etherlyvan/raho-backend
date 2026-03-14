import { z } from 'zod';

// ─── Sub-schemas untuk JSON field ───────────────────────────────────────────

const assessmentBodySchema = z.object({
  eligibility: z.enum(['ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL'], {
    errorMap: () => ({ message: 'Eligibility harus ELIGIBLE, NOT_ELIGIBLE, atau CONDITIONAL' }),
  }),
  targetOutcome: z.string().optional(),
  notes: z.string().optional(),
});

const treatmentPlanBodySchema = z.object({
  protocol: z.string().min(1, 'Protocol wajib diisi'),
  frequency: z.string().optional(),
  totalSessions: z.number().int().positive('Total sesi harus bilangan bulat positif').optional(),
  duration: z.string().optional(),
  specialNotes: z.string().optional(),
});

// ─── Request Schemas ─────────────────────────────────────────────────────────

export const createEncounterSchema = z.object({
  memberId: z.string().min(1, 'Member ID wajib diisi'),
  doctorId: z.string().min(1, 'Doctor ID wajib diisi'),
  branchId: z.string().min(1, 'Branch ID wajib diisi'),
  memberPackageId: z.string().min(1, 'Member Package ID wajib diisi'),
  type: z.enum(['CONSULTATION', 'TREATMENT'], {
    errorMap: () => ({ message: 'Type harus CONSULTATION atau TREATMENT' }),
  }),
  consultationEncounterId: z.string().optional(),
  treatmentDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
});

export const assessmentSchema = z.object({
  assessment: assessmentBodySchema,
  treatmentPlan: treatmentPlanBodySchema,
});

export const updateEncounterStatusSchema = z.object({
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status tidak valid' }),
  }),
});

export const encounterQuerySchema = z.object({
  memberId: z.string().optional(),
  branchId: z.string().optional(),
  type: z.enum(['CONSULTATION', 'TREATMENT']).optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

// ─── Exported Types ──────────────────────────────────────────────────────────

export type CreateEncounterInput = z.infer<typeof createEncounterSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type UpdateEncounterStatusInput = z.infer<typeof updateEncounterStatusSchema>;
export type EncounterQueryInput = z.infer<typeof encounterQuerySchema>;

