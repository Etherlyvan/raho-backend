import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateEncounterEmrNoteInput } from './encounter-emr-note.schema';

// ─── Selector ────────────────────────────────────────────────────────────────

const emrNoteSelect = {
  emrNoteId: true,
  encounterId: true,
  sessionId: true,
  type: true,
  authorRole: true,
  content: true,
  createdAt: true,
  author: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
  encounter: {
    select: {
      type: true,
      status: true,
      member: { select: { memberId: true, memberNo: true, fullName: true } },
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map role Prisma ke AuthorRole enum untuk field authorRole di EMRNote.
 */
const ROLE_TO_AUTHOR_ROLE: Partial<Record<RoleName, 'DOCTOR' | 'NURSE' | 'ADMIN'>> = {
  [RoleName.DOCTOR]: 'DOCTOR',
  [RoleName.NURSE]: 'NURSE',
  [RoleName.ADMIN]: 'ADMIN',
  [RoleName.MASTER_ADMIN]: 'ADMIN',
  [RoleName.SUPER_ADMIN]: 'ADMIN',
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const encounterEmrNoteService = {
  /**
   * #47 — POST /api/encounters/:encounterId/emr-notes
   */
  create: async (
    encounterId: string,
    data: CreateEncounterEmrNoteInput,
    authorId: string,
    authorRole: RoleName,
  ) => {
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId },
      select: { encounterId: true, type: true, status: true },
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);
    if (encounter.status === 'CANCELLED') {
      throw new AppError('Tidak dapat menambah catatan pada encounter yang sudah dibatalkan', 400);
    }

    // ASSESSMENT hanya boleh pada encounter CONSULTATION
    if (data.type === 'ASSESSMENT' && encounter.type !== 'CONSULTATION') {
      throw new AppError(
        'Catatan ASSESSMENT hanya dapat dibuat pada encounter bertipe CONSULTATION',
        400,
      );
    }

    const mappedAuthorRole = ROLE_TO_AUTHOR_ROLE[authorRole];
    if (!mappedAuthorRole) throw new AppError('Role tidak diizinkan untuk membuat catatan EMR', 403);

    return prisma.eMRNote.create({
      data: {
        encounterId,
        authorId,
        authorRole: mappedAuthorRole,
        type: data.type,
        content: data.content as Prisma.InputJsonValue,
      },
      select: emrNoteSelect,
    });
  },

  /**
   * GET /api/encounters/:encounterId/emr-notes
   */
  findAll: async (encounterId: string) => {
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId },
      select: { encounterId: true },
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);

    return prisma.eMRNote.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      select: emrNoteSelect,
    });
  },
};
