import { Router } from "express";
import { branchAccessController } from "./branch-access.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { grantAccessSchema } from "./branch-access.schema";
import { RoleName } from "../../generated/prisma";

const router = Router();

router.use(authenticate);

router.post("/",
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(grantAccessSchema),
  branchAccessController.grant
);

router.get("/:memberId",
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  branchAccessController.findByMember
);

router.patch("/:accessId/revoke",
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  branchAccessController.revoke
);

export default router;
