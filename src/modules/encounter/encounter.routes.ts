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
import { emrController } from '../emr/emr.controller';

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
// #74 — GET /api/encounters/:encounterId/emr-notes
router.get(
  '/:encounterId/emr-notes',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  emrController.findNotesByEncounter,
);

// #76 — GET /api/encounters/:encounterId/summary
router.get(
  '/:encounterId/summary',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  emrController.findEncounterSummary,
);

export default router;
