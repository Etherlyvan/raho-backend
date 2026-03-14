import { Request, Response, NextFunction } from "express";
import { memberService } from "./member.service";
import { memberQuerySchema, consentPhotoSchema } from "./member.schema";
import { sendSuccess } from "../../utils/response";

export const memberController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await memberService.create(req.body, req.user!.userId), "Pasien berhasil didaftarkan", 201);
    } catch (err) { next(err); }
  },

  findAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = memberQuerySchema.parse(req.query);
      const result = await memberService.findAll(query, req.user!);
      sendSuccess(res, result.data, "Data pasien berhasil diambil", 200, result.meta);
    } catch (err) { next(err); }
  },

  lookup: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { memberNo } = req.query;
      if (!memberNo || typeof memberNo !== "string") {
        res.status(400).json({ success: false, message: "Query parameter 'memberNo' wajib diisi" });
        return;
      }
      sendSuccess(res, await memberService.lookup(memberNo), "Pasien ditemukan");
    } catch (err) { next(err); }
  },

  findById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await memberService.findById(req.params.memberId), "Detail pasien berhasil diambil");
    } catch (err) { next(err); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await memberService.update(req.params.memberId, req.body), "Data pasien berhasil diperbarui");
    } catch (err) { next(err); }
  },

  toggleActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await memberService.toggleActive(req.params.memberId), "Status pasien berhasil diperbarui");
    } catch (err) { next(err); }
  },

  setConsentPhoto: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { isConsentToPhoto } = consentPhotoSchema.parse(req.body);
      sendSuccess(res, await memberService.setConsentPhoto(req.params.memberId, isConsentToPhoto), "Persetujuan foto berhasil diperbarui");
    } catch (err) { next(err); }
  },

  createDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await memberService.createDocument(req.params.memberId, req.body, req.user!.userId),
        "Dokumen berhasil diupload",
        201
      );
    } catch (err) { next(err); }
  },

  findDocuments: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await memberService.findDocuments(req.params.memberId), "Dokumen berhasil diambil");
    } catch (err) { next(err); }
  },

  deleteDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await memberService.deleteDocument(
        req.params.memberId,
        req.params.docId,
        req.user!.userId,
        req.user!.role
      );
      sendSuccess(res, null, "Dokumen berhasil dihapus");
    } catch (err) { next(err); }
  },
};
