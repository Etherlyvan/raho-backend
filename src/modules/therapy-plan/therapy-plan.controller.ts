import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { therapyPlanService } from './therapy-plan.service';

export const therapyPlanController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await therapyPlanService.create(req.params.sessionId, req.body, req.user!.userId),
        'Rencana terapi berhasil dibuat',
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
        await therapyPlanService.findOne(req.params.sessionId),
        'Rencana terapi berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await therapyPlanService.update(req.params.sessionId, req.body),
        'Rencana terapi berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },
};
