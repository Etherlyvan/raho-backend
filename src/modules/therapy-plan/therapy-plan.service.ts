import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateTherapyPlanInput, UpdateTherapyPlanInput } from './therapy-plan.schema';

const therapyPlanSelect = {
  sessionTherapyPlanId: true,
  treatmentSessionId: true,
  ifaMg: true,
  hhoMl: true,
  h2Ml: true,
  noMl: true,
  gasoMl: true,
  o2Ml: true,
  notes: true,
  plannedAt: true,
  createdAt: true,
  updatedAt: true,
  planner: {
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
          branch: { select: { name: true } },
        },
      },
    },
  },
} as const;

async function assertSessionForTherapyPlan(treatmentSessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId },
    select: { treatmentSessionId: true, status: true },
  });
  if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
  return session;
}

export const therapyPlanService = {
  /**
   * #51 — POST /:sessionId/therapy-plan
   * Hanya bisa dibuat saat status masih PLANNED.
   * Satu sesi hanya boleh memiliki satu therapy plan.
   */
  create: async (
    treatmentSessionId: string,
    data: CreateTherapyPlanInput,
    plannedBy: string,
  ) => {
    const session = await assertSessionForTherapyPlan(treatmentSessionId);

    if (session.status !== 'PLANNED') {
      throw new AppError(
        `Rencana terapi hanya dapat dibuat saat status PLANNED, status saat ini: ${session.status}`,
        400,
      );
    }

    const existing = await prisma.sessionTherapyPlan.findUnique({
      where: { treatmentSessionId },
    });
    if (existing) {
      throw new AppError(
        'Rencana terapi sudah ada. Gunakan PATCH untuk mengubahnya.',
        409,
      );
    }

    return prisma.sessionTherapyPlan.create({
      data: { treatmentSessionId, plannedBy, ...data },
      select: therapyPlanSelect,
    });
  },

  /**
   * #52 — GET /:sessionId/therapy-plan
   */
  findOne: async (treatmentSessionId: string) => {
    await assertSessionForTherapyPlan(treatmentSessionId);

    const plan = await prisma.sessionTherapyPlan.findUnique({
      where: { treatmentSessionId },
      select: therapyPlanSelect,
    });
    if (!plan) throw new AppError('Rencana terapi belum dibuat untuk sesi ini', 404);
    return plan;
  },

  /**
   * #53 — PATCH /:sessionId/therapy-plan
   * Hanya bisa diubah sebelum sesi IN_PROGRESS.
   */
  update: async (treatmentSessionId: string, data: UpdateTherapyPlanInput) => {
    const session = await assertSessionForTherapyPlan(treatmentSessionId);

    if (session.status === 'IN_PROGRESS') {
      throw new AppError(
        'Rencana terapi tidak dapat diubah setelah sesi dimulai (IN_PROGRESS)',
        400,
      );
    }
    if (session.status === 'COMPLETED') {
      throw new AppError('Rencana terapi tidak dapat diubah pada sesi yang sudah selesai', 400);
    }

    const existing = await prisma.sessionTherapyPlan.findUnique({
      where: { treatmentSessionId },
    });
    if (!existing) throw new AppError('Rencana terapi belum dibuat. Gunakan POST terlebih dahulu.', 404);

    return prisma.sessionTherapyPlan.update({
      where: { treatmentSessionId },
      data,
      select: therapyPlanSelect,
    });
  },
};
