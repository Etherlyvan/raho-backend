import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { invoiceController } from './invoice.controller';
import {
  payInvoiceSchema,
  rejectInvoiceSchema,
  updateInvoiceSchema,
} from './invoice.schema';

const router = Router();

router.use(authenticate);

// #89 — GET /api/invoices
router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  invoiceController.findAll,
);

// #90 — GET /api/invoices/:invoiceId
router.get(
  '/:invoiceId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  invoiceController.findById,
);

// #91 — PATCH /api/invoices/:invoiceId/pay
router.patch(
  '/:invoiceId/pay',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(payInvoiceSchema),
  invoiceController.pay,
);

// #92 — PATCH /api/invoices/:invoiceId/verify
router.patch(
  '/:invoiceId/verify',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  invoiceController.verify,
);

// #93 — PATCH /api/invoices/:invoiceId/reject
router.patch(
  '/:invoiceId/reject',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(rejectInvoiceSchema),
  invoiceController.reject,
);

// #94 — PATCH /api/invoices/:invoiceId (koreksi invoice PENDING)
router.patch(
  '/:invoiceId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN),
  validate(updateInvoiceSchema),
  invoiceController.update,
);

export default router;
