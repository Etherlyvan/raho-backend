import { z } from 'zod';

export const notificationQuerySchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  type: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 100) : 20)),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
