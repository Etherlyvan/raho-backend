import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { messageQuerySchema, sendMessageSchema } from './chat.schema';
import { chatService } from './chat.service';

export const chatController = {
  createRoom: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await chatService.createRoom(req.body, req.user!.userId),
        'Chat room berhasil dibuat',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findRooms: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await chatService.findRooms(req.user!.userId),
        'Daftar chat room berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  getMessages: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = messageQuerySchema.parse(req.query);
      const result = await chatService.getMessages(
        req.params.roomId,
        req.user!.userId,
        query,
      );
      sendSuccess(res, result.data, 'Pesan berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  sendMessage: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = sendMessageSchema.parse(req.body);
      sendSuccess(
        res,
        await chatService.sendMessage(req.params.roomId, req.user!.userId, body),
        'Pesan berhasil dikirim',
        201,
      );
    } catch (err) {
      next(err);
    }
  },
};
