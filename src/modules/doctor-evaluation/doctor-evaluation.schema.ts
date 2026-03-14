import { z } from 'zod';

const perubahanPlanSchema = z.object({
  alasan: z.string().min(1, 'Alasan perubahan plan wajib diisi'),
  perubahan: z.object({
    ifaMg: z.number().positive().optional(),
    hhoMl: z.number().positive().optional(),
    h2Ml: z.number().positive().optional(),
    noMl: z.number().positive().optional(),
    gasoMl: z.number().positive().optional(),
    o2Ml: z.number().positive().optional(),
  }),
});

export const createEvaluationSchema = z
  .object({
    kondisiPasien: z.string().optional(),
    progress: z.string().optional(),
    rekomendasiSesi: z.string().optional(),
    perubahanPlan: perubahanPlanSchema.optional(),
    notes: z.string().optional(),
  })
  .refine(
    data =>
      data.kondisiPasien !== undefined ||
      data.progress !== undefined ||
      data.rekomendasiSesi !== undefined ||
      data.notes !== undefined,
    { message: 'Minimal satu field evaluasi harus diisi' },
  );

export const updateEvaluationSchema = z.object({
  kondisiPasien: z.string().optional(),
  progress: z.string().optional(),
  rekomendasiSesi: z.string().optional(),
  perubahanPlan: perubahanPlanSchema.optional(),
  notes: z.string().optional(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;
