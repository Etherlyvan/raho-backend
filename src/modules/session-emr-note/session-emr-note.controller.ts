import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { sessionEmrNoteService } from './session-emr-note.service';

export const sessionEmrNoteController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await sessionEmrNoteService.create(
          req.params.sessionId,
          req.body,
          req.user!.userId,
          req.user!.role,
        ),
        'Catatan EMR sesi berhasil disimpan',
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
        await sessionEmrNoteService.findAll(req.params.sessionId),
        'Catatan EMR sesi berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },
};
