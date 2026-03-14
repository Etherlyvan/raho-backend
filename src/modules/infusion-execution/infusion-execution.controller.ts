import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { infusionService } from './infusion-execution.service';

export const infusionController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await infusionService.create(req.params.sessionId, req.body, req.user!.userId),
        'Data pelaksanaan infus berhasil disimpan',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findOne: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await infusionService.findOne(req.params.sessionId),
        'Data pelaksanaan infus berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await infusionService.update(req.params.sessionId, req.body),
        'Data pelaksanaan infus berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },
};
