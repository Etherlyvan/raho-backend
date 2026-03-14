import { z } from 'zod';

export const createInventorySchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  category: z.enum(['MEDICINE', 'DEVICE', 'CONSUMABLE'], {
    errorMap: () => ({ message: 'Kategori harus MEDICINE, DEVICE, atau CONSUMABLE' }),
  }),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  stock: z.number().nonnegative('Stok awal tidak boleh negatif').default(0),
  minThreshold: z
    .number()
    .nonnegative('Minimum threshold tidak boleh negatif')
    .default(0),
  location: z.string().optional(),
  partnershipId: z.string().optional(),
});

export const updateInventorySchema = createInventorySchema
  .omit({ stock: true })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus diisi untuk update',
  });

export const addStockSchema = z.object({
  amount: z.number().positive('Jumlah penambahan stok harus lebih dari 0'),
  notes: z.string().optional(),
});

export const inventoryQuerySchema = z.object({
  category: z.enum(['MEDICINE', 'DEVICE', 'CONSUMABLE']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
  branchId: z.string().optional(),
  belowThreshold: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
