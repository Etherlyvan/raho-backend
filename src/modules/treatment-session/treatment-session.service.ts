import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateTreatmentSessionInput, SessionQueryInput } from './treatment-session.schema';

// ─── Selectors ───────────────────────────────────────────────────────────────

/**
 * Selector ringan — digunakan untuk list.
 */
const sessionListSelect = {
  treatmentSessionId: true,
  encounterId: true,
  pelaksanaan: true,
  infusKe: true,
  boosterPackageId: true,
  treatmentDate: true,
  nextTreatmentDate: true,
  startedAt: true,
  completedAt: true,
  status: true,
  keluhanSebelum: true,
  keluhanSesudah: true,
  berhasilInfus: true,
  healingCrisis: true,
  createdAt: true,
  updatedAt: true,
  encounter: {
    select: {
      type: true,
      status: true,
      consultationEncounterId: true,
      member: {
        select: { memberId: true, memberNo: true, fullName: true },
      },
      branch: {
        select: { branchId: true, name: true, city: true, tipe: true },
      },
      memberPackage: {
        select: {
          memberPackageId: true,
          packageType: true,
          packageName: true,
          usedSessions: true,
          totalSessions: true,
        },
      },
    },
  },
  nurse: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
  boosterPackage: {
    select: {
      memberPackageId: true,
      packageType: true,
      packageName: true,
      usedSessions: true,
      totalSessions: true,
    },
  },
  _count: {
    select: {
      vitalSigns: true,
      materialUsages: true,
      photos: true,
      emrNotes: true,
    },
  },
} as const;

/**
 * Selector lengkap — digunakan untuk detail satu sesi.
 * Menyertakan seluruh sub-data: therapyPlan, infusion, evaluation, dll.
 */
const sessionDetailSelect = {
  ...sessionListSelect,
  therapyPlan: {
    select: {
      sessionTherapyPlanId: true,
      ifaMg: true,
      hhoMl: true,
      h2Ml: true,
      noMl: true,
      gasoMl: true,
      o2Ml: true,
      notes: true,
      plannedAt: true,
      planner: {
        select: {
          userId: true,
          staffCode: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  },
  infusionExecution: {
    select: {
      infusionExecutionId: true,
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
      filler: {
        select: {
          userId: true,
          staffCode: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  },
  evaluation: {
    select: {
      doctorEvaluationId: true,
      kondisiPasien: true,
      progress: true,
      rekomendasiSesi: true,
      perubahanPlan: true,
      notes: true,
      createdAt: true,
      doctor: {
        select: {
          userId: true,
          staffCode: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  },
  vitalSigns: {
    orderBy: { measuredAt: 'asc' as const },
    select: {
      sessionVitalSignId: true,
      measuredAt: true,
      nadi: true,
      pi: true,
      tensiSistolik: true,
      tensiDiastolik: true,
    },
  },
  materialUsages: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      materialUsageId: true,
      quantity: true,
      unit: true,
      createdAt: true,
      item: { select: { inventoryItemId: true, name: true, category: true } },
      inputByUser: {
        select: { userId: true, profile: { select: { fullName: true } } },
      },
    },
  },
  photos: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      sessionPhotoId: true,
      photoUrl: true,
      fileName: true,
      caption: true,
      takenAt: true,
      takenByUser: {
        select: { userId: true, profile: { select: { fullName: true } } },
      },
    },
  },
  emrNotes: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      emrNoteId: true,
      type: true,
      authorRole: true,
      content: true,
      createdAt: true,
      author: {
        select: { userId: true, profile: { select: { fullName: true } } },
      },
    },
  },
  invoice: {
    select: {
      invoiceId: true,
      amount: true,
      status: true,
      paidAt: true,
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertSessionExists(treatmentSessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId },
    select: sessionDetailSelect,
  });
  if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);
  return session;
}

/**
 * Hitung infusKe: urutan sesi ke-berapa dalam encounter ini,
 * tidak menghitung sesi yang POSTPONED/CANCELLED.
 */
async function resolveInfusKe(encounterId: string): Promise<number> {
  const count = await prisma.treatmentSession.count({
    where: {
      encounterId,
      status: { notIn: ['POSTPONED'] },
    },
  });
  return count + 1;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const treatmentSessionService = {
  /**
   * #48 — POST /api/treatment-sessions
   *
   * Business rules:
   *  - Encounter harus bertipe TREATMENT dan tidak CANCELLED/COMPLETED
   *  - Encounter TREATMENT harus memiliki consultationEncounterId (sudah ter-validasi saat buat encounter)
   *  - Assessment & treatmentPlan pada consultation harus sudah terisi
   *  - Paket BASIC harus ACTIVE dan masih ada sisa sesi
   *  - Jika boosterPackageId diisi:
   *      • Paket BOOSTER harus ACTIVE & milik pasien yang sama
   *      • Paket BOOSTER harus di cabang yang sama dengan paket BASIC
   *  - infusKe dihitung otomatis (tidak boleh dikirim dari client)
   */
  create: async (data: CreateTreatmentSessionInput) => {
    // 1. Validasi encounter
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId: data.encounterId },
      include: {
        memberPackage: true,
        member: { select: { memberId: true, status: true } },
      },
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);
    if (encounter.type !== 'TREATMENT') {
      throw new AppError('Sesi treatment hanya dapat dibuat pada encounter bertipe TREATMENT', 400);
    }
    if (encounter.status === 'CANCELLED') {
      throw new AppError('Encounter sudah dibatalkan', 400);
    }
    if (encounter.status === 'COMPLETED') {
      throw new AppError('Encounter sudah selesai, tidak dapat menambah sesi baru', 400);
    }

    // 2. Validasi paket BASIC
    const pkg = encounter.memberPackage;
    if (pkg.status !== 'ACTIVE') {
      throw new AppError(
        `Paket tidak dapat digunakan, status saat ini: ${pkg.status}`,
        400,
      );
    }
    if (pkg.usedSessions >= pkg.totalSessions) {
      throw new AppError('Seluruh sesi paket sudah terpakai', 400);
    }

    // 3. Validasi paket BOOSTER (jika ada)
    if (data.boosterPackageId) {
      const booster = await prisma.memberPackage.findFirst({
        where: {
          memberPackageId: data.boosterPackageId,
          memberId: encounter.member.memberId,
          packageType: 'BOOSTER',
        },
      });
      if (!booster) {
        throw new AppError('Paket BOOSTER tidak ditemukan atau bukan milik pasien ini', 404);
      }
      if (booster.status !== 'ACTIVE') {
        throw new AppError(`Paket BOOSTER tidak aktif, status: ${booster.status}`, 400);
      }
      if (booster.usedSessions >= booster.totalSessions) {
        throw new AppError('Seluruh sesi paket BOOSTER sudah terpakai', 400);
      }
      if (booster.branchId !== pkg.branchId) {
        throw new AppError('Paket BOOSTER harus berada di cabang yang sama dengan paket BASIC', 400);
      }
    }

    // 4. Validasi nurse (jika diisi)
    if (data.nurseId) {
      const nurse = await prisma.user.findUnique({
        where: { userId: data.nurseId },
        include: { role: true },
      });
      if (!nurse) throw new AppError('Perawat tidak ditemukan', 404);
      if (!nurse.isActive) throw new AppError('Akun perawat tidak aktif', 400);
      if (nurse.role.name !== RoleName.NURSE) {
        throw new AppError('User yang dipilih bukan perawat', 400);
      }
    }

    // 5. Hitung infusKe otomatis
    const infusKe = await resolveInfusKe(data.encounterId);

    return prisma.treatmentSession.create({
      data: {
        encounterId: data.encounterId,
        nurseId: data.nurseId ?? null,
        pelaksanaan: data.pelaksanaan ?? null,
        boosterPackageId: data.boosterPackageId ?? null,
        infusKe,
        treatmentDate: new Date(data.treatmentDate),
        nextTreatmentDate: data.nextTreatmentDate
          ? new Date(data.nextTreatmentDate)
          : null,
        keluhanSebelum: data.keluhanSebelum ?? null,
        status: 'PLANNED',
      },
      select: sessionDetailSelect,
    });
  },

  /**
   * #49 — GET /api/treatment-sessions
   *
   * Scoping rules:
   *  - ADMIN, DOCTOR, NURSE: hanya melihat sesi di cabang mereka sendiri
   *    (via encounter.branchId)
   *  - MASTER_ADMIN, SUPER_ADMIN: bisa filter by branchId opsional
   *  - Filter `date` memfilter berdasarkan hari treatmentDate (YYYY-MM-DD)
   */
  findAll: async (
    filters: SessionQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const { encounterId, nurseId, status, date, page, limit } = filters;
    const skip = (page - 1) * limit;

    const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.DOCTOR, RoleName.NURSE];
    const effectiveBranchId = scopedRoles.includes(requester.role)
      ? (requester.branchId ?? undefined)
      : (filters.branchId ?? undefined);

    // Filter by date: cari sesi yang treatmentDate-nya jatuh pada hari tersebut
    let dateFilter: Prisma.TreatmentSessionWhereInput = {};
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      dateFilter = {
        treatmentDate: { gte: start, lte: end },
      };
    }

    const where: Prisma.TreatmentSessionWhereInput = {
      encounterId,
      nurseId,
      status,
      ...dateFilter,
      encounter: effectiveBranchId
        ? { branchId: effectiveBranchId }
        : undefined,
    };

    const [data, total] = await prisma.$transaction([
      prisma.treatmentSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { treatmentDate: 'asc' },
        select: sessionListSelect,
      }),
      prisma.treatmentSession.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * #50 — GET /api/treatment-sessions/:sessionId
   * Mengembalikan seluruh sub-data: therapyPlan, infusionExecution,
   * evaluation, vitalSigns, materialUsages, photos, emrNotes, invoice.
   */
  findById: async (treatmentSessionId: string) =>
    assertSessionExists(treatmentSessionId),
};
