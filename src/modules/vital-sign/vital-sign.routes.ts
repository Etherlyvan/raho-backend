import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { vitalSignController } from './vital-sign.controller';
import { createVitalSignSchema } from './vital-sign.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(createVitalSignSchema),
  vitalSignController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  vitalSignController.findAll,
);

router.delete(
  '/:vsId',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  vitalSignController.remove,
);

export default router;
