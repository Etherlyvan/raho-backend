import { Router, Request, Response, NextFunction } from "express";
import { userController } from "./user.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createUserSchema, updateUserSchema, updateProfileSchema, resetPasswordSchema } from "./user.schema";
import { RoleName } from "../../generated/prisma";
import { sendError } from "../../utils/response";

const router = Router();

router.use(authenticate);

// Guard: self atau role admin ke atas
const selfOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const { userId, role } = req.user!;
  const adminRoles: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN, RoleName.ADMIN];
  const isAdmin = adminRoles.includes(role);
  if (userId === req.params.userId || isAdmin) { next(); return; }
  sendError(res, "Akses ditolak", 403);
};

// ─── Staff Management ─────────────────────────────────────────
router.get("/",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  userController.findAll
);

router.post("/",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  validate(createUserSchema),
  userController.create
);

// ─── Specific User ────────────────────────────────────────────
// PENTING: route statis (/profile) harus SEBELUM route dinamis (/:userId)
// untuk menghindari konflik routing di Express

router.get("/:userId",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN, RoleName.ADMIN),
  userController.findById
);

router.patch("/:userId",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  validate(updateUserSchema),
  userController.update
);

router.patch("/:userId/toggle-active",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  userController.toggleActive
);

router.patch("/:userId/reset-password",
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  validate(resetPasswordSchema),
  userController.resetPassword
);

// ─── Profile (self atau admin) ────────────────────────────────
router.get("/:userId/profile",   selfOrAdmin,                          userController.getProfile);
router.patch("/:userId/profile", selfOrAdmin, validate(updateProfileSchema), userController.updateProfile);

export default router;
