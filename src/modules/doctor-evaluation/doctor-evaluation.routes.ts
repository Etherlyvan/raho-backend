import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { evaluationController } from './doctor-evaluation.controller';
import { createEvaluationSchema, updateEvaluationSchema } from './doctor-evaluation.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.DOCTOR),
  validate(createEvaluationSchema),
  evaluationController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  evaluationController.findOne,
);

router.patch(
  '/',
  authorize(RoleName.DOCTOR),
  validate(updateEvaluationSchema),
  evaluationController.update,
);

export default router;
