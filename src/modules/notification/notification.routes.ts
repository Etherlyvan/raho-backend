import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationController } from './notification.controller';

const router = Router();

router.use(authenticate);

// ⚠️ Route statis SEBELUM route dinamis
// #97 — PATCH /api/notifications/read-all
router.patch('/read-all', notificationController.markAllRead);

// #95 — GET /api/notifications
router.get('/', notificationController.findAll);

// #96 — PATCH /api/notifications/:notifId/read
router.patch('/:notifId/read', notificationController.markRead);

// #98 — DELETE /api/notifications/:notifId
router.delete('/:notifId', notificationController.delete);

export default router;
