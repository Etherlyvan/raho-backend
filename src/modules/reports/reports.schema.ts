import { z } from 'zod';

const periodSchema = z.object({
  dateFrom: z
    .string()
    .datetime({ message: 'Format dateFrom tidak valid. Gunakan ISO 8601.' }),
  dateTo: z
    .string()
    .datetime({ message: 'Format dateTo tidak valid. Gunakan ISO 8601.' }),
  branchId: z.string().optional(),
});

export const revenueReportSchema = periodSchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export const treatmentReportSchema = periodSchema.extend({
  branchId: z.string().optional(),
});

export const inventoryReportSchema = z.object({
  branchId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  category: z.enum(['MEDICINE', 'DEVICE', 'CONSUMABLE']).optional(),
});

export const staffKpiSchema = periodSchema.extend({
  role: z.enum(['DOCTOR', 'NURSE']).optional(),
  branchId: z.string().optional(),
});

export const exportReportSchema = z.object({
  type: z.enum(['revenue', 'treatment', 'inventory', 'staff-kpi']),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  branchId: z.string().optional(),
});

export type RevenueReportInput    = z.infer<typeof revenueReportSchema>;
export type TreatmentReportInput  = z.infer<typeof treatmentReportSchema>;
export type InventoryReportInput  = z.infer<typeof inventoryReportSchema>;
export type StaffKpiInput         = z.infer<typeof staffKpiSchema>;
export type ExportReportInput     = z.infer<typeof exportReportSchema>;
