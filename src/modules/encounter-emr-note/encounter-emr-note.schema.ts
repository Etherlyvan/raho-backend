import { z } from 'zod';

/**
 * Tipe EMR Note yang diizinkan dalam konteks encounter:
 *  - ASSESSMENT    → Ringkasan klinis dokter setelah konsultasi
 *  - CLINICAL_NOTE → Catatan klinis tambahan (rencana tindak lanjut, dll.)
 */
export const createEncounterEmrNoteSchema = z.object({
  type: z.enum(['ASSESSMENT', 'CLINICAL_NOTE'], {
    errorMap: () => ({
      message: 'Type catatan EMR harus ASSESSMENT atau CLINICAL_NOTE untuk konteks encounter',
    }),
  }),
  content: z
    .record(z.unknown())
    .refine(obj => Object.keys(obj).length > 0, {
      message: 'Content catatan EMR tidak boleh kosong',
    }),
});

export type CreateEncounterEmrNoteInput = z.infer<typeof createEncounterEmrNoteSchema>;
