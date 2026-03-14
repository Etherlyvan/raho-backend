import { Router } from 'express';

import { RoleName } from '../../generated/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { treatmentSessionController } from './treatment-session.controller';
import {
  completeSessionSchema,
  createTreatmentSessionSchema,
  postponeSessionSchema,
  updateSessionSchema,
} from './treatment-session.schema';

// Sub-routers Sprint 6b
import therapyPlanRoutes from '../therapy-plan/therapy-plan.routes';
import infusionRoutes from '../infusion-execution/infusion-execution.routes';
import vitalSignRoutes from '../vital-sign/vital-sign.routes';
import materialUsageRoutes from '../material-usage/material-usage.routes';
import sessionPhotoRoutes from '../session-photo/session-photo.routes';
import evaluationRoutes from '../doctor-evaluation/doctor-evaluation.routes';
import sessionEmrNoteRoutes from '../session-emr-note/session-emr-note.routes';

const router = Router();

router.use(authenticate);

// ─── Core CRUD (Sprint 6a) ───────────────────────────────────────────────────

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

// ─── Lifecycle (Sprint 6b) ───────────────────────────────────────────────────

// #73 — Update umum (PATCH sebelum route spesifik agar tidak bentrok)
router.patch(
  '/:sessionId',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE),
  validate(updateSessionSchema),
  treatmentSessionController.update,
);

// #54 — Mulai sesi → IN_PROGRESS
router.patch(
  '/:sessionId/start',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  treatmentSessionController.start,
);

// #68 — Selesaikan sesi → COMPLETED + auto Invoice
router.patch(
  '/:sessionId/complete',
  authorize(RoleName.NURSE, RoleName.DOCTOR),
  validate(completeSessionSchema),
  treatmentSessionController.complete,
);

// #72 — Tunda sesi → POSTPONED
router.patch(
  '/:sessionId/postpone',
  authorize(RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR),
  validate(postponeSessionSchema),
  treatmentSessionController.postpone,
);

// ─── Nested Resources (Sprint 6b) ───────────────────────────────────────────

router.use('/:sessionId/therapy-plan', therapyPlanRoutes);        // #51–#53
router.use('/:sessionId/infusion', infusionRoutes);                // #58–#60
router.use('/:sessionId/vital-signs', vitalSignRoutes);            // #55–#57
router.use('/:sessionId/material-usages', materialUsageRoutes);    // #61–#63
router.use('/:sessionId/photos', sessionPhotoRoutes);              // #64–#66
router.use('/:sessionId/evaluation', evaluationRoutes);            // #69–#71
router.use('/:sessionId/emr-notes', sessionEmrNoteRoutes);         // #67

export default router;
