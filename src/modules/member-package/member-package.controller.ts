import { Request, Response, NextFunction } from "express";
import { memberPackageService } from "./member-package.service";
import { activePackageQuerySchema } from "./member-package.schema";
import { sendSuccess } from "../../utils/response";

export const memberPackageController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberPackageService.create(req.params.memberId, req.body, req.user!.userId),
        "Paket berhasil ditambahkan",
        201
      );
    } catch (err) { next(err); }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberPackageService.findAll(req.params.memberId),
        "Daftar paket berhasil diambil"
      );
    } catch (err) { next(err); }
  },

  findActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = activePackageQuerySchema.parse(req.query);
      sendSuccess(
        res,
        await memberPackageService.findActive(req.params.memberId, query),
        "Paket aktif berhasil diambil"
      );
    } catch (err) { next(err); }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberPackageService.findById(req.params.memberId, req.params.pkgId),
        "Detail paket berhasil diambil"
      );
    } catch (err) { next(err); }
  },

  confirmPayment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberPackageService.confirmPayment(
          req.params.memberId,
          req.params.pkgId,
          req.body,
          req.user!.userId
        ),
        "Pembayaran berhasil dikonfirmasi — paket sekarang ACTIVE"
      );
    } catch (err) { next(err); }
  },

  cancel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberPackageService.cancel(
          req.params.memberId,
          req.params.pkgId,
          req.body,
          req.user!.userId
        ),
        "Paket berhasil dibatalkan"
      );
    } catch (err) { next(err); }
  },
};
