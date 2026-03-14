import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { sessionPhotoService } from './session-photo.service';

export const sessionPhotoController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await sessionPhotoService.create(req.params.sessionId, req.body, req.user!.userId),
        'Foto sesi berhasil disimpan',
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
        await sessionPhotoService.findAll(req.params.sessionId),
        'Data foto sesi berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await sessionPhotoService.remove(req.params.sessionId, req.params.photoId);
      sendSuccess(res, null, 'Foto sesi berhasil dihapus');
    } catch (err) {
      next(err);
    }
  },
};
