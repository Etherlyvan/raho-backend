import { z } from 'zod';

const infusionBaseSchema = z.object({
  ifaMgActual: z.number().nonnegative().optional(),
  hhoMlActual: z.number().nonnegative().optional(),
  h2MlActual: z.number().nonnegative().optional(),
  noMlActual: z.number().nonnegative().optional(),
  gasoMlActual: z.number().nonnegative().optional(),
  o2MlActual: z.number().nonnegative().optional(),
  tglProduksiCairan: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
  jenisBotol: z.enum(['IFA', 'EDTA']).optional(),
  jenisCairan: z.string().optional(),
  volumeCarrierMl: z.number().int().positive().optional(),
  jumlahPenggunaanJarum: z.number().int().positive().optional(),
  deviationNote: z.string().optional(),
});

export const createInfusionSchema = infusionBaseSchema;
export const updateInfusionSchema = infusionBaseSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'Minimal satu field harus diisi untuk update' },
);

export type CreateInfusionInput = z.infer<typeof createInfusionSchema>;
export type UpdateInfusionInput = z.infer<typeof updateInfusionSchema>;
