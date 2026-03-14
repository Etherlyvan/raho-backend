import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { therapyPlanController } from './therapy-plan.controller';
import { createTherapyPlanSchema, updateTherapyPlanSchema } from './therapy-plan.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.DOCTOR),
  validate(createTherapyPlanSchema),
  therapyPlanController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  therapyPlanController.findOne,
);

router.patch(
  '/',
  authorize(RoleName.DOCTOR),
  validate(updateTherapyPlanSchema),
  therapyPlanController.update,
);

export default router;
