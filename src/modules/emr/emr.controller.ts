import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { emrService } from './emr.service';

export const emrController = {
  /**
   * #74 — GET /api/encounters/:encounterId/emr-notes
   */
  findNotesByEncounter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      sendSuccess(
        res,
        await emrService.findNotesByEncounter(req.params.encounterId, req.user!),
        'Catatan EMR encounter berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * #75 — GET /api/members/:memberId/emr
   */
  findFullEmr: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      sendSuccess(
        res,
        await emrService.findFullEmr(req.params.memberId, req.user!),
        'Full EMR pasien berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * #76 — GET /api/encounters/:encounterId/summary
   */
  findEncounterSummary: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      sendSuccess(
        res,
        await emrService.findEncounterSummary(req.params.encounterId, req.user!),
        'Ringkasan encounter berhasil diambil',
      );
    } catch (err) {
      next(err);
    }
  },
};
