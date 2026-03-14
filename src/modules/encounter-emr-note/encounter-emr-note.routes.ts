import { Router } from 'express';

import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { encounterEmrNoteController } from './encounter-emr-note.controller';
import { createEncounterEmrNoteSchema } from './encounter-emr-note.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.DOCTOR, RoleName.ADMIN),
  validate(createEncounterEmrNoteSchema),
  encounterEmrNoteController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  encounterEmrNoteController.findAll,
);

export default router;
