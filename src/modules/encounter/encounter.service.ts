import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  AssessmentInput,
  CreateEncounterInput,
  EncounterQueryInput,
  UpdateEncounterStatusInput,
} from './encounter.schema';

// ─── Selectors ───────────────────────────────────────────────────────────────

const encounterSelect = {
  encounterId: true,
  type: true,
  status: true,
  treatmentDate: true,
  completedAt: true,
  assessment: true,
  treatmentPlan: true,
  consultationEncounterId: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      memberId: true,
      memberNo: true,
      fullName: true,
      status: true,
    },
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
      status: true,
      usedSessions: true,
      totalSessions: true,
    },
  },
  _count: {
    select: { sessions: true, diagnoses: true, emrNotes: true },
  },
} as const;

const encounterDetailSelect = {
  ...encounterSelect,
  diagnoses: {
    orderBy: { createdAt: 'asc' as const },
  },
  emrNotes: {
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Status transition matrix.
 * Key: status saat ini → Value: daftar status yang diizinkan.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function assertEncounterExists(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { encounterId },
    include: { ...encounterDetailSelect },
  });
  if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);
  return encounter;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const encounterService = {
  /**
   * #37 — POST /api/encounters
   * Business rules:
   *   - Pasien harus ACTIVE
   *   - Paket harus ACTIVE dan belum habis sesinya
   *   - CONSULTATION: consultationEncounterId harus kosong
   *   - TREATMENT: consultationEncounterId wajib diisi dan harus valid milik pasien tersebut
   *   - Satu paket BASIC hanya boleh memiliki 1 CONSULTATION yang tidak CANCELLED
   */
  create: async (data: CreateEncounterInput) => {
    // 1. Validasi pasien
    const member = await prisma.member.findUnique({
      where: { memberId: data.memberId },
      select: { memberId: true, status: true },
    });
    if (!member) throw new AppError('Pasien tidak ditemukan', 404);
    if (member.status !== 'ACTIVE') throw new AppError('Akun pasien tidak aktif', 400);

    // 2. Validasi dokter
    const doctor = await prisma.user.findUnique({
      where: { userId: data.doctorId },
      include: { role: true },
    });
    if (!doctor) throw new AppError('Dokter tidak ditemukan', 404);
    if (!doctor.isActive) throw new AppError('Akun dokter tidak aktif', 400);
    if (doctor.role.name !== RoleName.DOCTOR) throw new AppError('User yang dipilih bukan dokter', 400);

    // 3. Validasi cabang
    const branch = await prisma.branch.findUnique({ where: { branchId: data.branchId } });
    if (!branch) throw new AppError('Cabang tidak ditemukan', 404);
    if (!branch.isActive) throw new AppError('Cabang tidak aktif', 400);

    // 4. Validasi paket
    const pkg = await prisma.memberPackage.findFirst({
      where: { memberPackageId: data.memberPackageId, memberId: data.memberId },
    });
    if (!pkg) throw new AppError('Paket tidak ditemukan atau bukan milik pasien ini', 404);
    if (pkg.status !== 'ACTIVE') {
      throw new AppError(
        `Paket tidak dapat digunakan, status saat ini: ${pkg.status}. Konfirmasi pembayaran terlebih dahulu.`,
        400,
      );
    }
    if (pkg.usedSessions >= pkg.totalSessions) {
      throw new AppError('Seluruh sesi paket sudah terpakai', 400);
    }

    // 5. Business rules berdasarkan type
    if (data.type === 'CONSULTATION') {
      if (data.consultationEncounterId) {
        throw new AppError('Encounter CONSULTATION tidak memerlukan referensi ke encounter lain', 400);
      }

      // Cegah duplikasi: satu paket hanya boleh 1 CONSULTATION aktif
      const existingConsultation = await prisma.encounter.findFirst({
        where: {
          memberPackageId: data.memberPackageId,
          type: 'CONSULTATION',
          status: { not: 'CANCELLED' },
        },
      });
      if (existingConsultation) {
        throw new AppError(
          'Paket ini sudah memiliki encounter CONSULTATION yang aktif. Batalkan encounter lama terlebih dahulu.',
          409,
        );
      }
    }

    if (data.type === 'TREATMENT') {
      if (!data.consultationEncounterId) {
        throw new AppError('Encounter TREATMENT wajib merujuk ke encounter CONSULTATION', 400);
      }

      // Consultation bisa lintas cabang (cross-branch)
      const consultation = await prisma.encounter.findFirst({
        where: {
          encounterId: data.consultationEncounterId,
          memberId: data.memberId,
          type: 'CONSULTATION',
        },
      });
      if (!consultation) {
        throw new AppError('Encounter CONSULTATION tidak ditemukan atau bukan milik pasien ini', 404);
      }
      if (consultation.status === 'CANCELLED') {
        throw new AppError('Encounter CONSULTATION yang dirujuk sudah dibatalkan', 400);
      }
      if (!consultation.assessment || !consultation.treatmentPlan) {
        throw new AppError(
          'Dokter belum mengisi assessment dan treatment plan pada encounter CONSULTATION',
          400,
        );
      }
    }

    return prisma.encounter.create({
      data: {
        memberId: data.memberId,
        doctorId: data.doctorId,
        branchId: data.branchId,
        memberPackageId: data.memberPackageId,
        type: data.type,
        consultationEncounterId: data.consultationEncounterId ?? null,
        treatmentDate: data.treatmentDate ? new Date(data.treatmentDate) : null,
        status: 'PLANNED',
      },
      select: encounterSelect,
    });
  },

  /**
   * #38 — GET /api/encounters
   * ADMIN, DOCTOR, NURSE hanya melihat encounter di cabang mereka sendiri.
   */
  findAll: async (
    filters: EncounterQueryInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const { memberId, type, status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const scopedRoles: RoleName[] = [RoleName.ADMIN, RoleName.MASTER_ADMIN, RoleName.DOCTOR, RoleName.NURSE];
    const effectiveBranchId = scopedRoles.includes(requester.role)
      ? (requester.branchId ?? undefined)
      : (filters.branchId ?? undefined);

    const where: Prisma.EncounterWhereInput = {
      memberId,
      branchId: effectiveBranchId,
      type,
      status,
    };

    const [data, total] = await prisma.$transaction([
      prisma.encounter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: encounterSelect,
      }),
      prisma.encounter.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * #39 — GET /api/encounters/:encounterId
   */
  findById: async (encounterId: string) => assertEncounterExists(encounterId),

  /**
   * #40 — PUT /api/encounters/:encounterId/assessment
   * Hanya untuk encounter CONSULTATION yang belum COMPLETED/CANCELLED.
   * Otomatis mengubah status menjadi ONGOING saat assessment pertama kali diisi.
   */
  updateAssessment: async (encounterId: string, data: AssessmentInput) => {
    const encounter = await assertEncounterExists(encounterId);

    if (encounter.type !== 'CONSULTATION') {
      throw new AppError('Assessment hanya dapat diisi pada encounter bertipe CONSULTATION', 400);
    }
    if (encounter.status === 'CANCELLED') throw new AppError('Encounter sudah dibatalkan', 400);
    if (encounter.status === 'COMPLETED') throw new AppError('Encounter sudah selesai', 400);

    return prisma.encounter.update({
      where: { encounterId },
      data: {
        assessment: data.assessment as Prisma.InputJsonValue,
        treatmentPlan: data.treatmentPlan as Prisma.InputJsonValue,
        // Otomatis set ONGOING saat dokter mengisi assessment
        status: encounter.status === 'PLANNED' ? 'ONGOING' : encounter.status,
      },
      select: encounterDetailSelect,
    });
  },

  /**
   * #41 — PATCH /api/encounters/:encounterId
   * Update status dengan validasi transisi yang ketat.
   */
  updateStatus: async (encounterId: string, data: UpdateEncounterStatusInput) => {
    const encounter = await assertEncounterExists(encounterId);

    const allowed = VALID_TRANSITIONS[encounter.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new AppError(
        `Perubahan status dari ${encounter.status} ke ${data.status} tidak diizinkan`,
        400,
      );
    }

    return prisma.encounter.update({
      where: { encounterId },
      data: {
        status: data.status,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
      select: encounterDetailSelect,
    });
  },
};
