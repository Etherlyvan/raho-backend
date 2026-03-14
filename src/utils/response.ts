import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export const sendSuccess = <T>(
  res: Response, data: T, message = "Success",
  statusCode = 200, meta?: ApiResponse["meta"]
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response, message: string, statusCode = 400, errors?: unknown
): Response => {
  const response: ApiResponse = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};
