import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateSessionEmrNoteInput } from './session-emr-note.schema';

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
} as const;

const ROLE_TO_AUTHOR_ROLE: Partial<Record<RoleName, 'DOCTOR' | 'NURSE' | 'ADMIN'>> = {
  [RoleName.DOCTOR]: 'DOCTOR',
  [RoleName.NURSE]: 'NURSE',
  [RoleName.ADMIN]: 'ADMIN',
  [RoleName.MASTER_ADMIN]: 'ADMIN',
  [RoleName.SUPER_ADMIN]: 'ADMIN',
};

export const sessionEmrNoteService = {
  /**
   * #67 — POST /:sessionId/emr-notes
   */
  create: async (
    sessionId: string,
    data: CreateSessionEmrNoteInput,
    authorId: string,
    authorRole: RoleName,
  ) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId: sessionId },
      select: {
        treatmentSessionId: true,
        status: true,
        encounterId: true,
      },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
    if (session.status === 'POSTPONED') {
      throw new AppError('Tidak dapat menambah catatan pada sesi yang ditunda', 400);
    }

    const mappedAuthorRole = ROLE_TO_AUTHOR_ROLE[authorRole];
    if (!mappedAuthorRole) throw new AppError('Role tidak diizinkan untuk membuat catatan EMR', 403);

    return prisma.eMRNote.create({
      data: {
        sessionId,
        encounterId: session.encounterId,
        authorId,
        authorRole: mappedAuthorRole,
        type: data.type,
        content: data.content as Prisma.InputJsonValue,
      },
      select: emrNoteSelect,
    });
  },

  /**
   * GET /:sessionId/emr-notes
   */
  findAll: async (sessionId: string) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId: sessionId },
      select: { treatmentSessionId: true },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    return prisma.eMRNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: emrNoteSelect,
    });
  },
};
