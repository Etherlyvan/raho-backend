import { Prisma } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateEvaluationInput, UpdateEvaluationInput } from './doctor-evaluation.schema';

const evaluationSelect = {
  doctorEvaluationId: true,
  treatmentSessionId: true,
  kondisiPasien: true,
  progress: true,
  rekomendasiSesi: true,
  perubahanPlan: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  doctor: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true, speciality: true } },
    },
  },
  session: {
    select: {
      status: true,
      infusKe: true,
      treatmentDate: true,
      encounter: {
        select: {
          member: { select: { memberId: true, memberNo: true, fullName: true } },
        },
      },
    },
  },
} as const;

export const evaluationService = {
  /**
   * #69 — POST /:sessionId/evaluation
   * Evaluasi dibuat setelah sesi COMPLETED.
   * Satu sesi hanya boleh memiliki satu evaluasi.
   */
  create: async (
    treatmentSessionId: string,
    data: CreateEvaluationInput,
    doctorId: string,
  ) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId },
      select: { treatmentSessionId: true, status: true },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    if (session.status !== 'COMPLETED') {
      throw new AppError(
        `Evaluasi hanya dapat dibuat setelah sesi COMPLETED, status saat ini: ${session.status}`,
        400,
      );
    }

    const existing = await prisma.doctorEvaluation.findUnique({
      where: { treatmentSessionId },
    });
    if (existing) {
      throw new AppError('Evaluasi sudah ada. Gunakan PATCH untuk mengubahnya.', 409);
    }

    return prisma.doctorEvaluation.create({
      data: {
        treatmentSessionId,
        doctorId,
        kondisiPasien: data.kondisiPasien ?? null,
        progress: data.progress ?? null,
        rekomendasiSesi: data.rekomendasiSesi ?? null,
        perubahanPlan: data.perubahanPlan
          ? (data.perubahanPlan as Prisma.InputJsonValue)
          : undefined,
        notes: data.notes ?? null,
      },
      select: evaluationSelect,
    });
  },

  /**
   * #70 — GET /:sessionId/evaluation
   */
  findOne: async (treatmentSessionId: string) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId },
      select: { treatmentSessionId: true },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    const evaluation = await prisma.doctorEvaluation.findUnique({
      where: { treatmentSessionId },
      select: evaluationSelect,
    });
    if (!evaluation) throw new AppError('Evaluasi belum dibuat untuk sesi ini', 404);
    return evaluation;
  },

  /**
   * #71 — PATCH /:sessionId/evaluation
   */
  update: async (treatmentSessionId: string, data: UpdateEvaluationInput) => {
    const existing = await prisma.doctorEvaluation.findUnique({
      where: { treatmentSessionId },
    });
    if (!existing) throw new AppError('Evaluasi belum ada. Gunakan POST terlebih dahulu.', 404);

    return prisma.doctorEvaluation.update({
      where: { treatmentSessionId },
      data: {
        kondisiPasien: data.kondisiPasien,
        progress: data.progress,
        rekomendasiSesi: data.rekomendasiSesi,
        perubahanPlan: data.perubahanPlan
          ? (data.perubahanPlan as Prisma.InputJsonValue)
          : undefined,
        notes: data.notes,
      },
      select: evaluationSelect,
    });
  },
};
