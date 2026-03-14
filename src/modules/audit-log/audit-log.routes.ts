import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { auditLogController } from './audit-log.controller';

const router = Router();

// #113 — GET /api/audit-logs
router.get(
  '/',
  authenticate,
  authorize(RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  auditLogController.findAll,
);

export default router;
