import { NextFunction, Request, Response } from 'express';

import { sendSuccess } from '../../utils/response';
import { encounterQuerySchema } from './encounter.schema';
import { encounterService } from './encounter.service';

export const encounterController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await encounterService.create(req.body), 'Encounter berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = encounterQuerySchema.parse(req.query);
      const result = await encounterService.findAll(query, req.user!);
      sendSuccess(res, result.data, 'Data encounter berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await encounterService.findById(req.params.encounterId),
        'Detail encounter berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  updateAssessment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await encounterService.updateAssessment(req.params.encounterId, req.body),
        'Assessment dan treatment plan berhasil disimpan',
      );
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await encounterService.updateStatus(req.params.encounterId, req.body),
        'Status encounter berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },
};
