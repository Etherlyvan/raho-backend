import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service";
import { userQuerySchema } from "./user.schema";
import { sendSuccess } from "../../utils/response";

export const userController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.create(req.body), "User berhasil dibuat", 201); }
    catch (err) { next(err); }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = userQuerySchema.parse(req.query);
      const result = await userService.findAll(query, req.user!);
      sendSuccess(res, result.data, "Data user berhasil diambil", 200, result.meta);
    } catch (err) { next(err); }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.findById(req.params.userId, req.user!), "Detail user berhasil diambil"); }
    catch (err) { next(err); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.update(req.params.userId, req.body), "User berhasil diperbarui"); }
    catch (err) { next(err); }
  },

  toggleActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.toggleActive(req.params.userId, req.user!.userId), "Status user berhasil diperbarui"); }
    catch (err) { next(err); }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.resetPassword(req.params.userId, req.body), "Password berhasil direset"); }
    catch (err) { next(err); }
  },

  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.getProfile(req.params.userId), "Profil berhasil diambil"); }
    catch (err) { next(err); }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.updateProfile(req.params.userId, req.body), "Profil berhasil diperbarui"); }
    catch (err) { next(err); }
  },
};
