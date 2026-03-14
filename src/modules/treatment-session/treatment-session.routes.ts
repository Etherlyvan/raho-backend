import { Router } from 'express';

import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { treatmentSessionController } from './treatment-session.controller';
import { createTreatmentSessionSchema } from './treatment-session.schema';

const router = Router();

router.use(authenticate);

// ─── Core Session CRUD ───────────────────────────────────────────────────────

router.post(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR),
  validate(createTreatmentSessionSchema),
  treatmentSessionController.create,
);

router.get(
  '/',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  treatmentSessionController.findAll,
);

router.get(
  '/:sessionId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  treatmentSessionController.findById,
);

// ─── Placeholder untuk Sprint 6b–6e (nested resources) ──────────────────────
// router.use('/:sessionId/therapy-plan',     therapyPlanRoutes);
// router.use('/:sessionId/infusion',         infusionRoutes);
// router.use('/:sessionId/vital-signs',      vitalSignRoutes);
// router.use('/:sessionId/material-usages',  materialUsageRoutes);
// router.use('/:sessionId/photos',           sessionPhotoRoutes);
// router.use('/:sessionId/evaluation',       evaluationRoutes);
// router.use('/:sessionId/emr-notes',        sessionEmrNoteRoutes);

export default router;
