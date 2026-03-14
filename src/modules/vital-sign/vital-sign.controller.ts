import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { vitalSignService } from './vital-sign.service';

export const vitalSignController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await vitalSignService.create(req.params.sessionId, req.body),
        'Tanda vital berhasil disimpan',
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
        await vitalSignService.findAll(req.params.sessionId),
        'Data tanda vital berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await vitalSignService.remove(req.params.sessionId, req.params.vsId);
      sendSuccess(res, null, 'Data tanda vital berhasil dihapus');
    } catch (err) {
      next(err);
    }
  },
};
