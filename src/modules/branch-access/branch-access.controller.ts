import { Request, Response, NextFunction } from "express";
import { branchAccessService } from "./branch-access.service";
import { sendSuccess } from "../../utils/response";

export const branchAccessController = {
  grant: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchAccessService.grant(req.body, req.user!.userId), "Akses cabang berhasil diberikan", 201);
    } catch (err) { next(err); }
  },

  findByMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchAccessService.findByMember(req.params.memberId), "Data akses cabang berhasil diambil");
    } catch (err) { next(err); }
  },

  revoke: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await branchAccessService.revoke(req.params.accessId), "Akses cabang berhasil dicabut");
    } catch (err) { next(err); }
  },
};
