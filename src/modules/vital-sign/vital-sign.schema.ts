import { z } from 'zod';

export const createVitalSignSchema = z
  .object({
    measuredAt: z
      .string()
      .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
      .optional(),
    nadi: z.number().int().positive('Nadi harus bilangan bulat positif').optional(),
    pi: z.number().nonnegative('PI harus lebih dari atau sama dengan 0').optional(),
    tensiSistolik: z.number().int().positive().optional(),
    tensiDiastolik: z.number().int().positive().optional(),
  })
  .refine(
    data =>
      data.nadi !== undefined ||
      data.pi !== undefined ||
      data.tensiSistolik !== undefined ||
      data.tensiDiastolik !== undefined,
    { message: 'Minimal satu data tanda vital harus diisi' },
  );

export type CreateVitalSignInput = z.infer<typeof createVitalSignSchema>;
