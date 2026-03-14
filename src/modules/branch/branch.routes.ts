import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { branchController } from './branch.controller';
import { createBranchSchema, updateBranchSchema } from './branch.schema';

const router = Router();

router.use(authenticate);

// ── Non-param routes ──────────────────────────────────────────────────────────

// GET /api/branches
router.get(
  '/',
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  branchController.findAll,
);

// POST /api/branches
router.post(
  '/',
  authorize(RoleName.SUPER_ADMIN),
  validate(createBranchSchema),
  branchController.create,
);

// ── Param routes — /:branchId/sub SEBELUM /:branchId ─────────────────────────
// ⚠️ Jika /:branchId didaftarkan duluan, Express akan menangkap "stats"
//    sebagai nilai branchId — hasil 404 atau data salah.

// #107 — GET /api/branches/:branchId/stats
router.get(
  '/:branchId/stats',
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  branchController.stats,
);

// GET /api/branches/:branchId
router.get(
  '/:branchId',
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN, RoleName.ADMIN),
  branchController.findById,
);

// PATCH /api/branches/:branchId
router.patch(
  '/:branchId',
  authorize(RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN),
  validate(updateBranchSchema),
  branchController.update,
);

// PATCH /api/branches/:branchId/toggle-active
router.patch(
  '/:branchId/toggle-active',
  authorize(RoleName.SUPER_ADMIN),
  branchController.toggleActive,
);

export default router;
