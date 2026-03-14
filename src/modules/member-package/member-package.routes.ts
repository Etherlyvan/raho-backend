import { Router } from "express";
import { memberPackageController } from "./member-package.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPackageSchema,
  confirmPaymentSchema,
  cancelPackageSchema,
} from "./member-package.schema";
import { RoleName } from "../../generated/prisma";

const router = Router({ mergeParams: true }); // ✅ mergeParams: akses :memberId dari parent router

router.use(authenticate);

// ─── PENTING: route statis HARUS sebelum route dinamis ───────
// /active harus sebelum /:pkgId

router.get("/",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR),
  memberPackageController.findAll
);

router.post("/",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(createPackageSchema),
  memberPackageController.create
);

// ✅ Route statis sebelum dinamis
router.get("/active",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  memberPackageController.findActive
);

router.get("/:pkgId",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR),
  memberPackageController.findById
);

router.patch("/:pkgId/confirm-payment",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(confirmPaymentSchema),
  memberPackageController.confirmPayment
);

router.patch("/:pkgId/cancel",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(cancelPackageSchema),
  memberPackageController.cancel
);

export default router;
