import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { sendSuccess } from "../../utils/response";

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await authService.login(req.body), "Login berhasil"); }
    catch (err) { next(err); }
  },

  getMe: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await authService.getMe(req.user!.userId), "Profil berhasil diambil"); }
    catch (err) { next(err); }
  },

  logout: (_req: Request, res: Response) => {
    res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
    sendSuccess(res, null, "Logout berhasil");
  },

  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await authService.changePassword(req.user!.userId, req.body), "Password berhasil diubah"); }
    catch (err) { next(err); }
  },
};
