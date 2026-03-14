import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { stockRequestController } from './stock-request.controller';
import {
  createStockRequestSchema,
  fulfillStockRequestSchema,
  rejectStockRequestSchema,
} from './stock-request.schema';

const router = Router();

router.use(authenticate);

// #84 — POST /api/stock-requests
router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(createStockRequestSchema),
  stockRequestController.create,
);

// #85 — GET /api/stock-requests
router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.NURSE),
  stockRequestController.findAll,
);

// #86 — PATCH /api/stock-requests/:requestId/approve
router.patch(
  '/:requestId/approve',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  stockRequestController.approve,
);

// #87 — PATCH /api/stock-requests/:requestId/reject
router.patch(
  '/:requestId/reject',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(rejectStockRequestSchema),
  stockRequestController.reject,
);

// #88 — PATCH /api/stock-requests/:requestId/fulfill
router.patch(
  '/:requestId/fulfill',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(fulfillStockRequestSchema),
  stockRequestController.fulfill,
);

export default router;
