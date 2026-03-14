import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { auditLogQuerySchema } from './audit-log.schema';
import { auditLogService } from './audit-log.service';

export const auditLogController = {
  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = auditLogQuerySchema.parse(req.query);
      const result = await auditLogService.findAll(query);
      sendSuccess(res, result.data, 'Audit log berhasil diambil', 200, result.meta);
    } catch (err) {
      next(err);
    }
  },
};
