import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sessionEmrNoteController } from './session-emr-note.controller';
import { createSessionEmrNoteSchema } from './session-emr-note.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(createSessionEmrNoteSchema),
  sessionEmrNoteController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  sessionEmrNoteController.findAll,
);

export default router;
