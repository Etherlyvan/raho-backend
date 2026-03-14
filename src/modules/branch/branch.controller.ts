import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { branchQuerySchema } from './branch.schema';
import { branchService } from './branch.service';

export const branchController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchService.create(req.body), 'Cabang berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = branchQuerySchema.parse(req.query);
      const result = await branchService.findAll(query);
      sendSuccess(res, result.data, 'Data cabang berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchService.findById(req.params.branchId), 'Detail cabang berhasil diambil');
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchService.update(req.params.branchId, req.body), 'Cabang berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  },

  toggleActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchService.toggleActive(req.params.branchId), 'Status cabang berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  },

  // #107 — GET /api/branches/:branchId/stats
  stats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchService.stats(req.params.branchId), 'Statistik cabang berhasil diambil');
    } catch (err) {
      next(err);
    }
  },
};
