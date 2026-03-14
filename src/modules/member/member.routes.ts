import { Router } from "express";
import { memberController } from "./member.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createMemberSchema, updateMemberSchema, createDocumentSchema } from "./member.schema";
import { RoleName } from "../../generated/prisma";
import { emrController } from '../emr/emr.controller';

const router = Router();

router.use(authenticate);

// ─── PENTING: route statis HARUS sebelum route dinamis ───────
// /lookup harus didefinisikan sebelum /:memberId

// ─── Member List & Lookup ─────────────────────────────────────
router.get("/",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  memberController.findAll
);

router.post("/",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(createMemberSchema),
  memberController.create
);

router.get("/lookup",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  memberController.lookup
);

// ─── Member Detail ────────────────────────────────────────────
router.get("/:memberId",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  memberController.findById
);

router.patch("/:memberId",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(updateMemberSchema),
  memberController.update
);

router.patch("/:memberId/toggle-active",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  memberController.toggleActive
);

router.patch("/:memberId/consent-photo",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  memberController.setConsentPhoto
);

// ─── Documents ────────────────────────────────────────────────
router.post("/:memberId/documents",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(createDocumentSchema),
  memberController.createDocument
);

router.get("/:memberId/documents",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR),
  memberController.findDocuments
);

router.delete("/:memberId/documents/:docId",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  memberController.deleteDocument
);

router.get(
  '/:memberId/emr',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  emrController.findFullEmr,
);

export default router;
