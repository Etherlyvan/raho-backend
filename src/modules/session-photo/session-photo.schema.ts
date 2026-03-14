import { z } from 'zod';

export const createSessionPhotoSchema = z.object({
  photoUrl: z.string().url('URL foto tidak valid'),
  fileName: z.string().min(1, 'Nama file wajib diisi'),
  fileSizeBytes: z.number().int().positive().optional(),
  caption: z.string().optional(),
  takenAt: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
});

export type CreateSessionPhotoInput = z.infer<typeof createSessionPhotoSchema>;
