import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
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
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 50)),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
