import { NextFunction, Request, Response } from 'express';

import { sendSuccess } from '../../utils/response';
import { diagnosisService } from './diagnosis.service';

export const diagnosisController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await diagnosisService.create(req.params.encounterId, req.body),
        'Diagnosis berhasil ditambahkan',
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
        await diagnosisService.findAll(req.params.encounterId),
        'Data diagnosis berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await diagnosisService.findById(req.params.encounterId, req.params.diagnosisId),
        'Detail diagnosis berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await diagnosisService.update(req.params.encounterId, req.params.diagnosisId, req.body),
        'Diagnosis berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await diagnosisService.remove(req.params.encounterId, req.params.diagnosisId);
      sendSuccess(res, null, 'Diagnosis berhasil dihapus');
    } catch (err) {
      next(err);
    }
  },
};
