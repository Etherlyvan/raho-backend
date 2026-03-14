import { z } from 'zod';

export const createStockRequestSchema = z.object({
  inventoryItemId: z.string().min(1, 'Item inventori wajib dipilih'),
  quantity: z.number().positive('Jumlah permintaan harus lebih dari 0'),
  reason: z.string().optional(),
});

export const stockRequestQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']).optional(),
  branchId: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export const rejectStockRequestSchema = z.object({
  reason: z.string().min(1, 'Alasan penolakan wajib diisi'),
});

export const fulfillStockRequestSchema = z.object({
  actualQuantity: z
    .number()
    .positive('Jumlah yang dipenuhi harus lebih dari 0')
    .optional(),
  notes: z.string().optional(),
});

export type CreateStockRequestInput = z.infer<typeof createStockRequestSchema>;
export type StockRequestQueryInput = z.infer<typeof stockRequestQuerySchema>;
export type RejectStockRequestInput = z.infer<typeof rejectStockRequestSchema>;
export type FulfillStockRequestInput = z.infer<typeof fulfillStockRequestSchema>;
