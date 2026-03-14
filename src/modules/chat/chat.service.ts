import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  CreateChatRoomInput,
  MessageQueryInput,
  SendMessageInput,
} from './chat.schema';

// ─── Selectors ───────────────────────────────────────────────────────────────

const chatRoomSelect = {
  chatRoomId: true,
  participants: true,
  createdAt: true,
  _count: { select: { messages: true } },
} as const;

const messageSelect = {
  chatMessageId: true,
  content: true,
  fileUrl: true,
  fileType: true,
  createdAt: true,
  sender: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertRoomParticipant(chatRoomId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { chatRoomId },
    select: { chatRoomId: true, participants: true },
  });
  if (!room) throw new AppError('Chat room tidak ditemukan', 404);
  if (!room.participants.includes(userId)) {
    throw new AppError('Anda bukan peserta chat room ini', 403);
  }
  return room;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const chatService = {
  /**
   * #99 — POST /api/chatrooms
   * Buat chat room baru.
   * req.user!.userId otomatis dimasukkan ke participants jika belum ada.
   * Cek duplikat: jika sudah ada room dengan participants yang sama, return existing.
   */
  createRoom: async (data: CreateChatRoomInput, createdBy: string) => {
    // Pastikan creator masuk ke participants
    const participantSet = new Set([...data.participants, createdBy]);
    const participants = Array.from(participantSet).sort(); // sort untuk normalisasi

    // Validasi semua userId exists
    const users = await prisma.user.findMany({
      where: { userId: { in: participants } },
      select: { userId: true },
    });
    if (users.length !== participants.length) {
      throw new AppError('Satu atau lebih participant tidak ditemukan', 404);
    }

    // Cek apakah room dengan participants yang sama sudah ada
    // Prisma tidak punya query untuk array equality, pakai findFirst + filter
    const existingRooms = await prisma.chatRoom.findMany({
      where: {
        participants: { hasEvery: participants },
      },
      select: { ...chatRoomSelect, participants: true },
    });

    const exactMatch = existingRooms.find(
      r =>
        r.participants.length === participants.length &&
        r.participants
          .slice()
          .sort()
          .every((p, i) => p === participants[i]),
    );

    if (exactMatch) return exactMatch;

    return prisma.chatRoom.create({
      data: { participants },
      select: chatRoomSelect,
    });
  },

  /**
   * #100 — GET /api/chatrooms
   * List chat room di mana req.user adalah peserta.
   * Sertakan pesan terakhir untuk preview.
   */
  findRooms: async (userId: string) => {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        participants: { has: userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...chatRoomSelect,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            chatMessageId: true,
            content: true,
            fileUrl: true,
            fileType: true,
            createdAt: true,
            sender: {
              select: {
                userId: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    // Tambahkan unreadCount per room
    const roomsWithUnread = await Promise.all(
      rooms.map(async room => {
        // Karena tidak ada model "last read", unread = pesan yang bukan dari user ini
        // setelah pesan terakhir dari user ini (simplified)
        return {
          ...room,
          lastMessage: room.messages[0] ?? null,
        };
      }),
    );

    return roomsWithUnread;
  },

  /**
   * #101 — GET /api/chatrooms/:roomId/messages
   * Ambil pesan dengan pagination (cursor-based via page/limit).
   * Guard: hanya peserta room.
   */
  getMessages: async (
    chatRoomId: string,
    userId: string,
    filters: MessageQueryInput,
  ) => {
    await assertRoomParticipant(chatRoomId, userId);

    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.chatMessage.findMany({
        where: { chatRoomId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: messageSelect,
      }),
      prisma.chatMessage.count({ where: { chatRoomId } }),
    ]);

    return {
      data: data.reverse(), // tampilkan dari yang lama ke baru
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * #102 — POST /api/chatrooms/:roomId/messages
   * Kirim pesan teks atau file ke chat room.
   * Guard: hanya peserta room.
   */
  sendMessage: async (
    chatRoomId: string,
    userId: string,
    data: SendMessageInput,
  ) => {
    await assertRoomParticipant(chatRoomId, userId);

    return prisma.chatMessage.create({
      data: {
        chatRoomId,
        senderId: userId,
        content: data.content ?? null,
        fileUrl: data.fileUrl ?? null,
        fileType: data.fileType ?? null,
      },
      select: messageSelect,
    });
  },
};
