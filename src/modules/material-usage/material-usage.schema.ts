import { z } from 'zod';

export const createMaterialUsageSchema = z.object({
  inventoryItemId: z.string().min(1, 'Item inventori wajib dipilih'),
  quantity: z.number().positive('Jumlah harus lebih dari 0'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
});

export type CreateMaterialUsageInput = z.infer<typeof createMaterialUsageSchema>;
