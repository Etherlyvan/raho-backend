import { Router } from 'express';

import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { diagnosisController } from './diagnosis.controller';
import { createDiagnosisSchema, updateDiagnosisSchema } from './diagnosis.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.DOCTOR),
  validate(createDiagnosisSchema),
  diagnosisController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  diagnosisController.findAll,
);

router.get(
  '/:diagnosisId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  diagnosisController.findById,
);

router.patch(
  '/:diagnosisId',
  authorize(RoleName.DOCTOR),
  validate(updateDiagnosisSchema),
  diagnosisController.update,
);

router.delete('/:diagnosisId', authorize(RoleName.DOCTOR), diagnosisController.remove);

export default router;
