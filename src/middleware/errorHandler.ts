import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma";
import { sendError } from "../utils/response";
import { logger } from "../utils/logger";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error(`${req.method} ${req.path} - ${err.message}`);

  if (err instanceof ZodError) { sendError(res, "Validation error", 422, err.flatten().fieldErrors); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") { sendError(res, `Data duplikat`, 409); return; }
    if (err.code === "P2025") { sendError(res, "Data tidak ditemukan", 404); return; }
  }
  if ((err as AppError).statusCode) { sendError(res, err.message, (err as AppError).statusCode); return; }
  sendError(res, "Internal server error", 500);
};

export class AppError extends Error {
  constructor(public message: string, public statusCode = 400) {
    super(message);
    this.name = "AppError";
  }
}
