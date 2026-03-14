import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { inventoryController } from './inventory.controller';
import {
  addStockSchema,
  createInventorySchema,
  updateInventorySchema,
} from './inventory.schema';

const router = Router();

router.use(authenticate);

// ⚠️ PENTING: Route statis /alerts HARUS didaftarkan SEBELUM /:itemId
// agar Express tidak menganggap "alerts" sebagai nilai :itemId

// #83 — GET /api/inventory/alerts
router.get(
  '/alerts',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.NURSE),
  inventoryController.findAlerts,
);

// #77 — POST /api/inventory
router.post(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(createInventorySchema),
  inventoryController.create,
);

// #78 — GET /api/inventory
router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  inventoryController.findAll,
);

// #79 — GET /api/inventory/:itemId
router.get(
  '/:itemId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  inventoryController.findById,
);

// #80 — PATCH /api/inventory/:itemId
router.patch(
  '/:itemId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(updateInventorySchema),
  inventoryController.update,
);

// #81 — PATCH /api/inventory/:itemId/add-stock
router.patch(
  '/:itemId/add-stock',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(addStockSchema),
  inventoryController.addStock,
);

// #82 — DELETE /api/inventory/:itemId
router.delete(
  '/:itemId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  inventoryController.remove,
);

export default router;
