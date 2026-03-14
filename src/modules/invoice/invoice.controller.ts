import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { invoiceQuerySchema } from './invoice.schema';
import { invoiceService } from './invoice.service';

export const invoiceController = {
  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = invoiceQuerySchema.parse(req.query);
      const result = await invoiceService.findAll(query, req.user!);
      sendSuccess(res, result.data, 'Data invoice berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await invoiceService.findById(req.params.invoiceId, req.user!),
        'Detail invoice berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  pay: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await invoiceService.pay(req.params.invoiceId, req.body),
        'Invoice berhasil ditandai lunas',
      );
    } catch (err) {
      next(err);
    }
  },

  verify: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await invoiceService.verify(req.params.invoiceId, req.user!.userId),
        'Pembayaran invoice berhasil diverifikasi',
      );
    } catch (err) {
      next(err);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await invoiceService.reject(req.params.invoiceId, req.body),
        'Invoice berhasil ditolak',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await invoiceService.update(req.params.invoiceId, req.body),
        'Invoice berhasil dikoreksi',
      );
    } catch (err) {
      next(err);
    }
  },

  findByMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = invoiceQuerySchema.parse(req.query);
      const result = await invoiceService.findByMember(
        req.params.memberId,
        query,
        req.user!,
      );
      sendSuccess(
        res,
        { member: result.member, invoices: result.data },
        'Riwayat invoice pasien berhasil diambil',
        200,
        result.meta,
      );
    } catch (err) {
      next(err);
    }
  },
};
