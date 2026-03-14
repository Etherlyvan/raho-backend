import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  admin: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await dashboardService.adminDashboard(req.user!),
        'Dashboard admin berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  doctor: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await dashboardService.doctorDashboard(req.user!.userId, req.user!.branchId),
        'Dashboard dokter berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  nurse: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await dashboardService.nurseDashboard(req.user!.branchId),
        'Dashboard perawat berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },
  patient: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            sendSuccess(
            res,
            await dashboardService.patientDashboard(req.user!.userId),
            'Dashboard pasien berhasil diambil',
            );
        } catch (err) {
            next(err);
        }
    },
};
