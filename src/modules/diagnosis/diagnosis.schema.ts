import { z } from 'zod';

export const createDiagnosisSchema = z.object({
  doktorPemeriksa: z.string().min(1, 'Nama dokter pemeriksa wajib diisi'),
  diagnosa: z.string().min(1, 'Diagnosa utama wajib diisi'),
  icdPrimer: z.string().optional(),
  icdSekunder: z.string().optional(),
  icdTersier: z.string().optional(),
  keluhanRiwayatSekarang: z.string().optional(),
  riwayatPenyakitTerdahulu: z.string().optional(),
  riwayatSosialKebiasaan: z.string().optional(),
  riwayatPengobatan: z.string().optional(),
  pemeriksaanFisik: z.string().optional(),
});

export const updateDiagnosisSchema = createDiagnosisSchema.partial();

export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>;
