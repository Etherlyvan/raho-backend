import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  exportReportSchema,
  inventoryReportSchema,
  revenueReportSchema,
  staffKpiSchema,
  treatmentReportSchema,
} from './reports.schema';
import { reportsService } from './reports.service';

export const reportsController = {
  revenue: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = revenueReportSchema.parse(req.query);
      sendSuccess(
        res,
        await reportsService.revenue(filters, req.user!),
        'Laporan revenue berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  treatment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = treatmentReportSchema.parse(req.query);
      sendSuccess(
        res,
        await reportsService.treatment(filters, req.user!),
        'Laporan treatment berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  inventory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = inventoryReportSchema.parse(req.query);
      sendSuccess(
        res,
        await reportsService.inventory(filters, req.user!),
        'Laporan inventori berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  staffKpi: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = staffKpiSchema.parse(req.query);
      sendSuccess(
        res,
        await reportsService.staffKpi(filters, req.user!),
        'Laporan KPI staff berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  export: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = exportReportSchema.parse(req.query);
      const { filename, csv } = await reportsService.export(filters, req.user!);

      // Stream CSV langsung — tidak pakai sendSuccess
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send('\uFEFF' + csv); // BOM untuk Excel compatibility
    } catch (err) {
      next(err);
    }
  },
};
