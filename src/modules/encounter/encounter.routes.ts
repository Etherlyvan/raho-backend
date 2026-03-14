import { Router } from 'express';

import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { RoleName } from '../../generated/prisma';
import { encounterController } from './encounter.controller';
import {
  assessmentSchema,
  createEncounterSchema,
  updateEncounterStatusSchema,
} from './encounter.schema';

import diagnosisRoutes from '../diagnosis/diagnosis.routes';
import encounterEmrNoteRoutes from '../encounter-emr-note/encounter-emr-note.routes';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR),
  validate(createEncounterSchema),
  encounterController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  encounterController.findAll,
);

router.get(
  '/:encounterId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  encounterController.findById,
);

router.put(
  '/:encounterId/assessment',
  authorize(RoleName.DOCTOR),
  validate(assessmentSchema),
  encounterController.updateAssessment,
);

router.patch(
  '/:encounterId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR),
  validate(updateEncounterStatusSchema),
  encounterController.updateStatus,
);

router.use('/:encounterId/diagnoses', diagnosisRoutes);
router.use('/:encounterId/emr-notes', encounterEmrNoteRoutes);

export default router;
