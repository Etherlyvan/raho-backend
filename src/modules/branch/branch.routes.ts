import { Router } from "express";
import { branchController } from "./branch.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createBranchSchema, updateBranchSchema } from "./branch.schema";
import { RoleName } from "../../generated/prisma";

const router = Router();

router.use(authenticate);

router.get(  "/",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  branchController.findAll
);

router.post( "/",
  authorize(RoleName.SUPER_ADMIN),
  validate(createBranchSchema),
  branchController.create
);

router.get(  "/:branchId",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN, RoleName.ADMIN),
  branchController.findById
);

router.patch("/:branchId",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  validate(updateBranchSchema),
  branchController.update
);

router.patch("/:branchId/toggle-active",
  authorize(RoleName.SUPER_ADMIN),
  branchController.toggleActive
);

export default router;
