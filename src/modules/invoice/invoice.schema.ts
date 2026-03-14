import { z } from 'zod';

export const payInvoiceSchema = z.object({
  paidAt: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
    .optional(),
  notes: z.string().optional(),
});

export const rejectInvoiceSchema = z.object({
  reason: z.string().min(1, 'Alasan penolakan wajib diisi'),
});

export const updateInvoiceSchema = z.object({
  amount: z.number().positive('Jumlah invoice harus lebih dari 0').optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        price: z.number().nonnegative(),
      }),
    )
    .min(1)
    .optional(),
  notes: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Minimal satu field harus diisi untuk update',
});

export const invoiceQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'REJECTED']).optional(),
  memberId: z.string().optional(),
  branchId: z.string().optional(),
  dateFrom: z
    .string()
    .datetime()
    .optional()
    .transform(v => (v ? new Date(v) : undefined)),
  dateTo: z
    .string()
    .datetime()
    .optional()
    .transform(v => (v ? new Date(v) : undefined)),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type RejectInvoiceInput = z.infer<typeof rejectInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
