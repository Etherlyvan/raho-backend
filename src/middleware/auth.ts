import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { sendError } from "../utils/response";
import { RoleName } from "../generated/prisma";

interface JwtPayload {
  userId: string; email: string; role: RoleName; branchId: string | null;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { sendError(res, "Token tidak ditemukan", 401); return; }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch { sendError(res, "Token tidak valid atau sudah expired", 401); }
};

export const authorize =
  (...roles: RoleName[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, "Unauthorized", 401); return; }
    if (!roles.includes(req.user.role)) { sendError(res, "Akses ditolak", 403); return; }
    next();
  };
