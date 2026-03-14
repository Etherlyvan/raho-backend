import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { materialUsageService } from './material-usage.service';

export const materialUsageController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await materialUsageService.create(req.params.sessionId, req.body, req.user!.userId),
        'Pemakaian bahan berhasil dicatat',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await materialUsageService.findAll(req.params.sessionId),
        'Data pemakaian bahan berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await materialUsageService.remove(req.params.sessionId, req.params.muId);
      sendSuccess(res, null, 'Data pemakaian bahan berhasil dihapus. Stok telah dikembalikan.');
    } catch (err) {
      next(err);
    }
  },
};
