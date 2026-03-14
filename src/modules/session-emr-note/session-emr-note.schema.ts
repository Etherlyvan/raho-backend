import { z } from 'zod';

/**
 * Tipe EMR Note yang diizinkan dalam konteks sesi (Perawat/Dokter):
 *  - OPERATIONAL_NOTE    → Catatan operasional perawat selama sesi
 *  - OUTCOME_MONITORING  → Monitoring hasil/reaksi pasien
 *  - CLINICAL_NOTE       → Catatan klinis tambahan dokter
 */
export const createSessionEmrNoteSchema = z.object({
  type: z.enum(['OPERATIONAL_NOTE', 'OUTCOME_MONITORING', 'CLINICAL_NOTE'], {
    errorMap: () => ({
      message:
        'Type catatan harus OPERATIONAL_NOTE, OUTCOME_MONITORING, atau CLINICAL_NOTE',
    }),
  }),
  content: z
    .record(z.unknown())
    .refine(obj => Object.keys(obj).length > 0, {
      message: 'Content catatan EMR tidak boleh kosong',
    }),
});

export type CreateSessionEmrNoteInput = z.infer<typeof createSessionEmrNoteSchema>;
