import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { stockRequestQuerySchema } from './stock-request.schema';
import { stockRequestService } from './stock-request.service';

export const stockRequestController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await stockRequestService.create(req.body, req.user!.userId, req.user!),
        'Permintaan stok berhasil diajukan',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = stockRequestQuerySchema.parse(req.query);
      const result = await stockRequestService.findAll(query, req.user!);
      sendSuccess(res, result.data, 'Data permintaan stok berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await stockRequestService.approve(req.params.requestId),
        'Permintaan stok berhasil di-approve',
      );
    } catch (err) {
      next(err);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await stockRequestService.reject(req.params.requestId, req.body),
        'Permintaan stok berhasil ditolak',
      );
    } catch (err) {
      next(err);
    }
  },

  fulfill: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await stockRequestService.fulfill(req.params.requestId, req.body),
        'Permintaan stok berhasil dipenuhi. Stok telah ditambahkan.',
      );
    } catch (err) {
      next(err);
    }
  },
};
