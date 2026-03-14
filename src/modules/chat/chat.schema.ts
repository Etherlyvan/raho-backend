import { z } from 'zod';

export const createChatRoomSchema = z.object({
  participants: z
    .array(z.string().min(1))
    .min(2, 'Chat room minimal memiliki 2 peserta')
    .refine(arr => new Set(arr).size === arr.length, {
      message: 'Participants tidak boleh duplikat',
    }),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).optional(),
  fileUrl: z.string().url('URL file tidak valid').optional(),
  fileType: z.string().optional(),
}).refine(data => data.content || data.fileUrl, {
  message: 'Pesan harus memiliki content atau fileUrl',
});

export const messageQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(parseInt(v, 10), 50) : 20)),
});

export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
