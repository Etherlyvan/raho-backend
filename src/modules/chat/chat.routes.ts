import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { chatController } from './chat.controller';
import { createChatRoomSchema } from './chat.schema';

const router = Router();

router.use(authenticate);

// #99 — POST /api/chatrooms
router.post(
  '/',
  validate(createChatRoomSchema),
  chatController.createRoom,
);

// #100 — GET /api/chatrooms
router.get('/', chatController.findRooms);

// #101 — GET /api/chatrooms/:roomId/messages
router.get('/:roomId/messages', chatController.getMessages);

// #102 — POST /api/chatrooms/:roomId/messages
// Validasi sendMessageSchema di dalam controller (bukan middleware)
// karena refine cross-field tidak bisa via validate middleware generic
router.post('/:roomId/messages', chatController.sendMessage);

export default router;
