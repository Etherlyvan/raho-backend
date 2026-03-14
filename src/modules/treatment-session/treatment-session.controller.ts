import { NextFunction, Request, Response } from 'express';

import { sendSuccess } from '../../utils/response';
import { sessionQuerySchema } from './treatment-session.schema';
import { treatmentSessionService } from './treatment-session.service';

export const treatmentSessionController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.create(req.body),
        'Sesi treatment berhasil dibuat',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = sessionQuerySchema.parse(req.query);
      const result = await treatmentSessionService.findAll(query, req.user!);
      sendSuccess(res, result.data, 'Data sesi treatment berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.findById(req.params.sessionId),
        'Detail sesi treatment berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },
    start: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.start(req.params.sessionId),
        'Sesi treatment berhasil dimulai',
      );
    } catch (err) {
      next(err);
    }
  },

  complete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.complete(req.params.sessionId, req.body),
        'Sesi treatment berhasil diselesaikan. Invoice telah dibuat.',
      );
    } catch (err) {
      next(err);
    }
  },

  postpone: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.postpone(req.params.sessionId, req.body),
        'Sesi treatment berhasil ditunda',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await treatmentSessionService.update(req.params.sessionId, req.body),
        'Sesi treatment berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },

};
