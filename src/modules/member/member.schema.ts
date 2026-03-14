import { z } from "zod";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const createMemberSchema = z.object({
  fullName:             z.string().min(1, "Nama lengkap wajib diisi"),
  registrationBranchId: z.string().min(1, "Cabang registrasi wajib diisi"),
  nik:                  z.string().length(16, "NIK harus 16 digit").optional(),
  tempatLahir:          z.string().optional(),
  dateOfBirth:          z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
  jenisKelamin:         z.enum(["L", "P"]).optional(),
  phone:                z.string().optional(),
  email:                z.string().email("Format email tidak valid").optional(),
  address:              z.string().optional(),
  pekerjaan:            z.string().optional(),
  statusNikah:          z.string().optional(),
  emergencyContact:     z.string().optional(),
  medicalHistory:       z.record(z.unknown()).optional(),
  sumberInfoRaho:       z.string().optional(),
  partnershipId:        z.string().optional(),
});

export const updateMemberSchema = createMemberSchema
  .partial()
  .omit({ registrationBranchId: true });

export const memberQuerySchema = z.object({
  search:   z.string().optional(),
  status:   z.enum(["ACTIVE", "INACTIVE", "LEAD"]).optional(),
  branchId: z.string().optional(),
  page:     z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit:    z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export const consentPhotoSchema = z.object({
  isConsentToPhoto: z.boolean({ required_error: "isConsentToPhoto wajib diisi" }),
});

export const createDocumentSchema = z.object({
  documentType: z.enum([
    "FORMULIR_PENDAFTARAN",
    "SURAT_PERNYATAAN",
    "SURAT_KEPUTUSAN",
    "PERSETUJUAN_SETELAH_PENJELASAN",
    "HASIL_LAB",
    "FOTO_KONDISI",
    "REKAM_MEDIS_LUAR",
    "KTP",
    "OTHER",
  ]),
  fileUrl:            z.string().url("URL file tidak valid"),
  fileName:           z.string().min(1, "Nama file wajib diisi"),
  mimeType:           z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Format file harus image/jpeg, image/png, atau image/webp" }),
  }),
  fileSizeBytes:      z.number().int().positive().optional(),
  relatedEncounterId: z.string().optional(),
  relatedSessionId:   z.string().optional(),
});

export type CreateMemberInput   = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput   = z.infer<typeof updateMemberSchema>;
export type MemberQueryInput    = z.infer<typeof memberQuerySchema>;
export type ConsentPhotoInput   = z.infer<typeof consentPhotoSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
