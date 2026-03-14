import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { notificationQuerySchema } from './notification.schema';
import { notificationService } from './notification.service';

export const notificationController = {
  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await notificationService.findAll(req.user!.userId, query);
      sendSuccess(res, result.data, 'Notifikasi berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  markRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await notificationService.markRead(req.params.notifId, req.user!.userId),
        'Notifikasi ditandai sudah dibaca',
      );
    } catch (err) {
      next(err);
    }
  },

  markAllRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await notificationService.markAllRead(req.user!.userId),
        'Semua notifikasi ditandai sudah dibaca',
      );
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await notificationService.delete(req.params.notifId, req.user!.userId),
        'Notifikasi berhasil dihapus',
      );
    } catch (err) {
      next(err);
    }
  },
};
