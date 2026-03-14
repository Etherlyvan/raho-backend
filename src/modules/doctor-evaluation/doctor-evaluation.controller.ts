import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { evaluationService } from './doctor-evaluation.service';

export const evaluationController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await evaluationService.create(req.params.sessionId, req.body, req.user!.userId),
        'Evaluasi dokter berhasil disimpan',
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
        await evaluationService.findOne(req.params.sessionId),
        'Evaluasi dokter berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await evaluationService.update(req.params.sessionId, req.body),
        'Evaluasi dokter berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },
};
