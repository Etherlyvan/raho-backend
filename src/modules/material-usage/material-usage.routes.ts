import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { materialUsageController } from './material-usage.controller';
import { createMaterialUsageSchema } from './material-usage.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(createMaterialUsageSchema),
  materialUsageController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  materialUsageController.findAll,
);

router.delete(
  '/:muId',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  materialUsageController.remove,
);

export default router;
