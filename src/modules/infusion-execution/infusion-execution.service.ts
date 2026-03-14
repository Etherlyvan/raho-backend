import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateInfusionInput, UpdateInfusionInput } from './infusion-execution.schema';

const infusionSelect = {
  infusionExecutionId: true,
  treatmentSessionId: true,
  ifaMgActual: true,
  hhoMlActual: true,
  h2MlActual: true,
  noMlActual: true,
  gasoMlActual: true,
  o2MlActual: true,
  tglProduksiCairan: true,
  jenisBotol: true,
  jenisCairan: true,
  volumeCarrierMl: true,
  jumlahPenggunaanJarum: true,
  deviationNote: true,
  filledAt: true,
  createdAt: true,
  updatedAt: true,
  filler: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
  session: {
    select: {
      status: true,
      infusKe: true,
      therapyPlan: {
        select: {
          ifaMg: true, hhoMl: true, h2Ml: true,
          noMl: true, gasoMl: true, o2Ml: true,
        },
      },
    },
  },
} as const;

/**
 * Cek apakah ada deviasi antara nilai aktual dan nilai rencana.
 * Jika ada deviasi dan deviationNote tidak diisi, throw error.
 */
function validateDeviationNote(
  data: CreateInfusionInput | UpdateInfusionInput,
  plan: {
    ifaMg: number | null;
    hhoMl: number;
    h2Ml: number | null;
    noMl: number | null;
    gasoMl: number | null;
    o2Ml: number | null;
  } | null,
) {
  if (!plan) return; // Tidak ada rencana → tidak bisa dibandingkan

  const hasDiff =
    (data.ifaMgActual !== undefined && data.ifaMgActual !== plan.ifaMg) ||
    (data.hhoMlActual !== undefined && data.hhoMlActual !== plan.hhoMl) ||
    (data.h2MlActual !== undefined && data.h2MlActual !== plan.h2Ml) ||
    (data.noMlActual !== undefined && data.noMlActual !== plan.noMl) ||
    (data.gasoMlActual !== undefined && data.gasoMlActual !== plan.gasoMl) ||
    (data.o2MlActual !== undefined && data.o2MlActual !== plan.o2Ml);

  if (hasDiff && !data.deviationNote) {
    throw new AppError(
      'Terdapat perbedaan dosis aktual dengan rencana terapi. Field deviationNote wajib diisi.',
      400,
    );
  }
}

async function assertInProgressSession(treatmentSessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId },
    select: {
      treatmentSessionId: true,
      status: true,
      therapyPlan: {
        select: {
          ifaMg: true, hhoMl: true, h2Ml: true,
          noMl: true, gasoMl: true, o2Ml: true,
        },
      },
    },
  });
  if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
  return session;
}

export const infusionService = {
  /**
   * #58 — POST /:sessionId/infusion
   */
  create: async (treatmentSessionId: string, data: CreateInfusionInput, filledBy: string) => {
    const session = await assertInProgressSession(treatmentSessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        `Data infus hanya dapat diinput saat sesi IN_PROGRESS, status saat ini: ${session.status}`,
        400,
      );
    }

    const existing = await prisma.infusionExecution.findUnique({
      where: { treatmentSessionId },
    });
    if (existing) {
      throw new AppError('Data infus sudah ada. Gunakan PATCH untuk mengubahnya.', 409);
    }

    validateDeviationNote(data, session.therapyPlan);

    return prisma.infusionExecution.create({
      data: {
        treatmentSessionId,
        filledBy,
        ...data,
        tglProduksiCairan: data.tglProduksiCairan
          ? new Date(data.tglProduksiCairan)
          : null,
        filledAt: new Date(),
      },
      select: infusionSelect,
    });
  },

  /**
   * #59 — GET /:sessionId/infusion
   */
  findOne: async (treatmentSessionId: string) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId },
      select: { treatmentSessionId: true },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    const infusion = await prisma.infusionExecution.findUnique({
      where: { treatmentSessionId },
      select: infusionSelect,
    });
    if (!infusion) throw new AppError('Data pelaksanaan infus belum diinput', 404);
    return infusion;
  },

  /**
   * #60 — PATCH /:sessionId/infusion
   * Hanya bisa diubah selama IN_PROGRESS.
   */
  update: async (treatmentSessionId: string, data: UpdateInfusionInput) => {
    const session = await assertInProgressSession(treatmentSessionId);

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        'Data infus hanya dapat diubah saat sesi masih IN_PROGRESS',
        400,
      );
    }

    validateDeviationNote(data, session.therapyPlan);

    const existing = await prisma.infusionExecution.findUnique({
      where: { treatmentSessionId },
    });
    if (!existing) throw new AppError('Data infus belum ada. Gunakan POST terlebih dahulu.', 404);

    return prisma.infusionExecution.update({
      where: { treatmentSessionId },
      data: {
        ...data,
        tglProduksiCairan: data.tglProduksiCairan
          ? new Date(data.tglProduksiCairan)
          : undefined,
      },
      select: infusionSelect,
    });
  },
};
