import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateVitalSignInput } from './vital-sign.schema';

const vitalSignSelect = {
  sessionVitalSignId: true,
  treatmentSessionId: true,
  measuredAt: true,
  nadi: true,
  pi: true,
  tensiSistolik: true,
  tensiDiastolik: true,
} as const;

async function assertSessionExists(treatmentSessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId },
    select: { treatmentSessionId: true, status: true },
  });
  if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
  return session;
}

export const vitalSignService = {
  /**
   * #55 — POST /:sessionId/vital-signs
   * Bisa diinput berkali-kali selama IN_PROGRESS.
   */
  create: async (treatmentSessionId: string, data: CreateVitalSignInput) => {
    const session = await assertSessionExists(treatmentSessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        `Tanda vital hanya dapat diinput saat sesi IN_PROGRESS, status saat ini: ${session.status}`,
        400,
      );
    }

    return prisma.sessionVitalSign.create({
      data: {
        treatmentSessionId,
        measuredAt: data.measuredAt ? new Date(data.measuredAt) : new Date(),
        nadi: data.nadi ?? null,
        pi: data.pi ?? null,
        tensiSistolik: data.tensiSistolik ?? null,
        tensiDiastolik: data.tensiDiastolik ?? null,
      },
      select: vitalSignSelect,
    });
  },

  /**
   * #56 — GET /:sessionId/vital-signs
   */
  findAll: async (treatmentSessionId: string) => {
    await assertSessionExists(treatmentSessionId);

    return prisma.sessionVitalSign.findMany({
      where: { treatmentSessionId },
      orderBy: { measuredAt: 'asc' },
      select: vitalSignSelect,
    });
  },

  /**
   * #57 — DELETE /:sessionId/vital-signs/:vsId
   */
  remove: async (treatmentSessionId: string, sessionVitalSignId: string): Promise<void> => {
    const session = await assertSessionExists(treatmentSessionId);

    if (session.status === 'COMPLETED') {
      throw new AppError('Tidak dapat menghapus tanda vital pada sesi yang sudah selesai', 400);
    }

    const record = await prisma.sessionVitalSign.findFirst({
      where: { sessionVitalSignId, treatmentSessionId },
    });
    if (!record) throw new AppError('Data tanda vital tidak ditemukan', 404);

    await prisma.sessionVitalSign.delete({ where: { sessionVitalSignId } });
  },
};
