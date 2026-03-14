import { z } from 'zod';

export const createTherapyPlanSchema = z.object({
  ifaMg: z.number().positive('IFA Mg harus lebih dari 0').optional(),
  hhoMl: z.number().positive('HHO Ml wajib diisi dan harus lebih dari 0'),
  h2Ml: z.number().positive().optional(),
  noMl: z.number().positive().optional(),
  gasoMl: z.number().positive().optional(),
  o2Ml: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const updateTherapyPlanSchema = createTherapyPlanSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'Minimal satu field harus diisi untuk update' },
);

export type CreateTherapyPlanInput = z.infer<typeof createTherapyPlanSchema>;
export type UpdateTherapyPlanInput = z.infer<typeof updateTherapyPlanSchema>;
