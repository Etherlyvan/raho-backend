import { Router } from 'express';
import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sessionPhotoController } from './session-photo.controller';
import { createSessionPhotoSchema } from './session-photo.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(createSessionPhotoSchema),
  sessionPhotoController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  sessionPhotoController.findAll,
);

router.delete(
  '/:photoId',
  authorize(RoleName.NURSE, RoleName.DOCTOR, RoleName.ADMIN),
  sessionPhotoController.remove,
);

export default router;
