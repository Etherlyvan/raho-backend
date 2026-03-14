import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateDiagnosisInput, UpdateDiagnosisInput } from './diagnosis.schema';

// ─── Selector ────────────────────────────────────────────────────────────────

const diagnosisSelect = {
  diagnosisId: true,
  encounterId: true,
  doktorPemeriksa: true,
  diagnosa: true,
  icdPrimer: true,
  icdSekunder: true,
  icdTersier: true,
  keluhanRiwayatSekarang: true,
  riwayatPenyakitTerdahulu: true,
  riwayatSosialKebiasaan: true,
  riwayatPengobatan: true,
  pemeriksaanFisik: true,
  createdAt: true,
  updatedAt: true,
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
 * Validasi encounter:
 *  - Harus ada dan bertipe CONSULTATION
 *  - Tidak boleh CANCELLED
 */
async function assertConsultationEncounter(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { encounterId },
    select: { encounterId: true, type: true, status: true },
  });
  if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);
  if (encounter.type !== 'CONSULTATION') {
    throw new AppError('Diagnosis hanya dapat ditambahkan pada encounter bertipe CONSULTATION', 400);
  }
  if (encounter.status === 'CANCELLED') {
    throw new AppError('Encounter sudah dibatalkan, tidak dapat menambah diagnosis', 400);
  }
  return encounter;
}

async function assertDiagnosisExists(encounterId: string, diagnosisId: string) {
  const diagnosis = await prisma.diagnosis.findFirst({
    where: { diagnosisId, encounterId },
    select: diagnosisSelect,
  });
  if (!diagnosis) throw new AppError('Diagnosis tidak ditemukan', 404);
  return diagnosis;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const diagnosisService = {
  /**
   * #42 — POST /api/encounters/:encounterId/diagnoses
   */
  create: async (encounterId: string, data: CreateDiagnosisInput) => {
    await assertConsultationEncounter(encounterId);

    return prisma.diagnosis.create({
      data: { encounterId, ...data },
      select: diagnosisSelect,
    });
  },

  /**
   * #43 — GET /api/encounters/:encounterId/diagnoses
   */
  findAll: async (encounterId: string) => {
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId },
      select: { encounterId: true },
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);

    return prisma.diagnosis.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'asc' },
      select: diagnosisSelect,
    });
  },

  /**
   * #44 — GET /api/encounters/:encounterId/diagnoses/:diagnosisId
   */
  findById: async (encounterId: string, diagnosisId: string) =>
    assertDiagnosisExists(encounterId, diagnosisId),

  /**
   * #45 — PATCH /api/encounters/:encounterId/diagnoses/:diagnosisId
   * Tidak bisa mengedit diagnosis jika encounter sudah COMPLETED atau CANCELLED.
   */
  update: async (encounterId: string, diagnosisId: string, data: UpdateDiagnosisInput) => {
    const diagnosis = await assertDiagnosisExists(encounterId, diagnosisId);

    if (diagnosis.encounter.status === 'CANCELLED') {
      throw new AppError('Tidak dapat mengedit diagnosis pada encounter yang sudah dibatalkan', 400);
    }
    if (diagnosis.encounter.status === 'COMPLETED') {
      throw new AppError('Tidak dapat mengedit diagnosis pada encounter yang sudah selesai', 400);
    }

    return prisma.diagnosis.update({
      where: { diagnosisId },
      data,
      select: diagnosisSelect,
    });
  },

  /**
   * #46 — DELETE /api/encounters/:encounterId/diagnoses/:diagnosisId
   * Tidak bisa menghapus diagnosis jika encounter sudah COMPLETED.
   */
  remove: async (encounterId: string, diagnosisId: string): Promise<void> => {
    const diagnosis = await assertDiagnosisExists(encounterId, diagnosisId);

    if (diagnosis.encounter.status === 'COMPLETED') {
      throw new AppError('Tidak dapat menghapus diagnosis pada encounter yang sudah selesai', 400);
    }
    if (diagnosis.encounter.status === 'CANCELLED') {
      throw new AppError('Tidak dapat menghapus diagnosis pada encounter yang sudah dibatalkan', 400);
    }

    await prisma.diagnosis.delete({ where: { diagnosisId } });
  },
};
