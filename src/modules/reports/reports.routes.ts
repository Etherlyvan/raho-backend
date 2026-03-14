import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { reportsController } from './reports.controller';

const router = Router();

router.use(authenticate);

// ⚠️ Route /export SEBELUM route lain agar tidak tertangkap param lain

// #112 — GET /api/reports/export
router.get(
  '/export',
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  reportsController.export,
);

// #108 — GET /api/reports/revenue
router.get(
  '/revenue',
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  reportsController.revenue,
);

// #109 — GET /api/reports/treatment
router.get(
  '/treatment',
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  reportsController.treatment,
);

// #110 — GET /api/reports/inventory
router.get(
  '/inventory',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  reportsController.inventory,
);

// #111 — GET /api/reports/staff-kpi
router.get(
  '/staff-kpi',
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  reportsController.staffKpi,
);

export default router;
