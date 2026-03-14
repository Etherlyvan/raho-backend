import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { inventoryQuerySchema } from './inventory.schema';
import { inventoryService } from './inventory.service';

export const inventoryController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await inventoryService.create(req.body, req.user!),
        'Item inventori berhasil ditambahkan',
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = inventoryQuerySchema.parse(req.query);
      const result = await inventoryService.findAll(query, req.user!);
      sendSuccess(res, result.data, 'Data inventori berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },

  // ⚠️ Route statis /alerts HARUS didaftarkan SEBELUM /:itemId
  findAlerts: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await inventoryService.findAlerts(req.user!),
        'Alert stok berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await inventoryService.findById(req.params.itemId),
        'Detail item inventori berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await inventoryService.update(req.params.itemId, req.body),
        'Item inventori berhasil diperbarui',
      );
    } catch (err) {
      next(err);
    }
  },

  addStock: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await inventoryService.addStock(req.params.itemId, req.body),
        'Stok berhasil ditambahkan',
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.remove(req.params.itemId);
      sendSuccess(
        res,
        result,
        result === null
          ? 'Item inventori berhasil dihapus permanen'
          : 'Item inventori dinonaktifkan (memiliki riwayat pemakaian)',
      );
    } catch (err) {
      next(err);
    }
  },
};
