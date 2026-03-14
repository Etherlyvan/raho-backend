import { NextFunction, Request, Response } from 'express';

import { sendSuccess } from '../../utils/response';
import { encounterEmrNoteService } from './encounter-emr-note.service';

export const encounterEmrNoteController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await encounterEmrNoteService.create(
          req.params.encounterId,
          req.body,
          req.user!.userId,
          req.user!.role,
        ),
        'Catatan EMR berhasil disimpan',
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
        await encounterEmrNoteService.findAll(req.params.encounterId),
        'Catatan EMR berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },
};
