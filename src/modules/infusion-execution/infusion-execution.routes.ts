import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { infusionController } from './infusion-execution.controller';
import { createInfusionSchema, updateInfusionSchema } from './infusion-execution.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(createInfusionSchema),
  infusionController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  infusionController.findOne,
);

router.patch(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(updateInfusionSchema),
  infusionController.update,
);

export default router;
