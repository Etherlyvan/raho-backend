import { RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

// ─── Selectors ───────────────────────────────────────────────────────────────

const emrNoteSelect = {
  emrNoteId: true,
  type: true,
  authorRole: true,
  content: true,
  createdAt: true,
  sessionId: true,
  encounterId: true,
  author: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
} as const;

const encounterSummarySelect = {
  encounterId: true,
  type: true,
  status: true,
  treatmentDate: true,
  completedAt: true,
  assessment: true,
  treatmentPlan: true,
  consultationEncounterId: true,
  createdAt: true,
  member: {
    select: { memberId: true, memberNo: true, fullName: true, dateOfBirth: true },
  },
  doctor: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true, speciality: true } },
    },
  },
  branch: {
    select: { branchId: true, name: true, city: true, tipe: true },
  },
  memberPackage: {
    select: {
      memberPackageId: true,
      packageType: true,
      packageName: true,
      totalSessions: true,
      usedSessions: true,
      status: true,
    },
  },
  diagnoses: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      diagnosisId: true,
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
    },
  },
  sessions: {
    orderBy: { infusKe: 'asc' as const },
    select: {
      treatmentSessionId: true,
      infusKe: true,
      status: true,
      pelaksanaan: true,
      treatmentDate: true,
      completedAt: true,
      berhasilInfus: true,
      healingCrisis: true,
      keluhanSebelum: true,
      keluhanSesudah: true,
      therapyPlan: {
        select: {
          hhoMl: true, ifaMg: true, h2Ml: true,
          noMl: true, gasoMl: true, o2Ml: true, notes: true,
        },
      },
      infusionExecution: {
        select: {
          hhoMlActual: true, ifaMgActual: true, h2MlActual: true,
          noMlActual: true, gasoMlActual: true, o2MlActual: true,
          jenisBotol: true, jenisCairan: true,
          volumeCarrierMl: true, deviationNote: true,
        },
      },
      evaluation: {
        select: {
          kondisiPasien: true,
          progress: true,
          rekomendasiSesi: true,
          perubahanPlan: true,
          notes: true,
        },
      },
      vitalSigns: {
        orderBy: { measuredAt: 'asc' as const },
        select: {
          measuredAt: true,
          nadi: true,
          pi: true,
          tensiSistolik: true,
          tensiDiastolik: true,
        },
      },
      nurse: {
        select: {
          userId: true,
          staffCode: true,
          profile: { select: { fullName: true } },
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
      _count: {
        select: { vitalSigns: true, materialUsages: true, photos: true },
      },
    },
  },
  emrNotes: {
    orderBy: { createdAt: 'desc' as const },
    select: emrNoteSelect,
  },
  _count: {
    select: { sessions: true, diagnoses: true, emrNotes: true },
  },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

export const emrService = {
  /**
   * #74 — GET /api/encounters/:encounterId/emr-notes
   *
   * List semua catatan EMR milik encounter tertentu,
   * termasuk catatan dari semua sesi yang terhubung ke encounter ini.
   * Role scoping: ADMIN/DOCTOR/NURSE hanya bisa akses encounter di cabangnya.
   */
  findNotesByEncounter: async (
    encounterId: string,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId },
      select: {
        encounterId: true,
        branchId: true,
        type: true,
        status: true,
        member: { select: { memberId: true, memberNo: true, fullName: true } },
        _count: { select: { emrNotes: true } },
      },
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);

    // Scoping: role cabang tidak bisa akses encounter cabang lain
    const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.DOCTOR, RoleName.NURSE];
    if (
      scopedRoles.includes(requester.role) &&
      requester.branchId &&
      encounter.branchId !== requester.branchId
    ) {
      throw new AppError('Anda tidak memiliki akses ke encounter ini', 403);
    }

    const notes = await prisma.eMRNote.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      select: emrNoteSelect,
    });

    return {
      encounter: {
        encounterId: encounter.encounterId,
        type: encounter.type,
        status: encounter.status,
        member: encounter.member,
        totalNotes: encounter._count.emrNotes,
      },
      notes,
    };
  },

  /**
   * #75 — GET /api/members/:memberId/emr
   *
   * Full EMR pasien — lintas semua cabang.
   * Mengembalikan seluruh riwayat: paket, encounter, diagnoses, sesi, catatan.
   *
   * Scoping rules:
   *  - ADMIN/DOCTOR/NURSE: hanya melihat encounter di cabang mereka + encounter
   *    lintas cabang jika pasien punya branch-access aktif ke cabang tersebut.
   *  - MASTER_ADMIN/SUPER_ADMIN: melihat semua encounter.
   */
  findFullEmr: async (
    memberId: string,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const member = await prisma.member.findUnique({
      where: { memberId },
      select: {
        memberId: true,
        memberNo: true,
        fullName: true,
        dateOfBirth: true,
        jenisKelamin: true,
        phone: true,
        email: true,
        address: true,
        status: true,
        isConsentToPhoto: true,
        createdAt: true,
        documents: {
          select: {
            memberDocumentId: true,
            documentType: true,
            fileUrl: true,
            fileName: true,
            uploadedAt: true,
          },
        },
         branchAccesses: {
          where: { isActive: true },
          select: {
            accessId: true,
            branch: { select: { branchId: true, name: true, city: true } },
            grantedAt: true,
          },
        },
      },
    });
    if (!member) throw new AppError('Pasien tidak ditemukan', 404);

    // Tentukan scope cabang yang boleh dilihat requester
    const freeScopeRoles: RoleName[] = [RoleName.MASTER_ADMIN, RoleName.SUPER_ADMIN];
    const isFreescope = freeScopeRoles.includes(requester.role);

    // Ambil branchId yang bisa diakses requester untuk pasien ini
    const accessibleBranchIds = isFreescope
      ? undefined
      : [
          requester.branchId!,
          ...member.branchAccesses.map(a => a.branch.branchId),
        ].filter(Boolean);

    // Ambil semua paket pasien
    const packages = await prisma.memberPackage.findMany({
      where: {
        memberId,
        ...(accessibleBranchIds
          ? { branchId: { in: accessibleBranchIds } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        memberPackageId: true,
        packageType: true,
        packageName: true,
        status: true,
        totalSessions: true,
        usedSessions: true,
        price: true,
        activatedAt: true,
        expiredAt: true,
        branch: { select: { branchId: true, name: true, city: true } },
      },
    });

    // Ambil semua encounter (CONSULTATION & TREATMENT)
    const encounters = await prisma.encounter.findMany({
      where: {
        memberId,
        ...(accessibleBranchIds
          ? { branchId: { in: accessibleBranchIds } }
          : {}),
      },
      orderBy: { treatmentDate: 'desc' },
      select: encounterSummarySelect,
    });

    // Hitung statistik ringkas
    const totalSessions = encounters.reduce(
      (sum, enc) => sum + enc._count.sessions,
      0,
    );
    const completedSessions = encounters.reduce(
      (sum, enc) =>
        sum + enc.sessions.filter(s => s.status === 'COMPLETED').length,
      0,
    );
    const totalInvoiced = await prisma.invoice.aggregate({
      where: {
        session: { encounter: { memberId } },
        status: 'PAID',
      },
      _sum: { amount: true },
    });

    return {
      member,
      stats: {
        totalPackages: packages.length,
        totalEncounters: encounters.length,
        totalSessions,
        completedSessions,
        totalPaid: totalInvoiced._sum.amount ?? 0,
      },
      packages,
      encounters,
    };
  },

  /**
   * #76 — GET /api/encounters/:encounterId/summary
   *
   * Ringkasan lengkap satu encounter:
   * assessment, treatmentPlan, diagnoses, semua sesi + evaluasi,
   * dan seluruh catatan EMR.
   */
  findEncounterSummary: async (
    encounterId: string,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const encounter = await prisma.encounter.findUnique({
      where: { encounterId },
      select: encounterSummarySelect,
    });
    if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);

    // Scoping
    const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.DOCTOR, RoleName.NURSE];
    if (
      scopedRoles.includes(requester.role) &&
      requester.branchId &&
      encounter.branch.branchId !== requester.branchId
    ) {
      throw new AppError('Anda tidak memiliki akses ke encounter ini', 403);
    }

    // Hitung ringkasan sesi
    const sessionStats = {
      total: encounter.sessions.length,
      completed: encounter.sessions.filter(s => s.status === 'COMPLETED').length,
      inProgress: encounter.sessions.filter(s => s.status === 'IN_PROGRESS').length,
      planned: encounter.sessions.filter(s => s.status === 'PLANNED').length,
      postponed: encounter.sessions.filter(s => s.status === 'POSTPONED').length,
      berhasilInfus: encounter.sessions.filter(s => s.berhasilInfus === true).length,
    };

    return {
      ...encounter,
      sessionStats,
    };
  },
};
