import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.use(authenticate);

// #103 — GET /api/dashboard/admin
router.get(
  '/admin',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  dashboardController.admin,
);

// #104 — GET /api/dashboard/doctor
router.get(
  '/doctor',
  authorize(RoleName.DOCTOR),
  dashboardController.doctor,
);

// #105 — GET /api/dashboard/nurse
router.get(
  '/nurse',
  authorize(RoleName.NURSE),
  dashboardController.nurse,
);

router.get(
  '/patient',
  authorize(RoleName.PATIENT),
  dashboardController.patient,
);

export default router;
