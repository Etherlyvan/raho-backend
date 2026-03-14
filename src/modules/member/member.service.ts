import { Prisma, RoleName } from "../../generated/prisma";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  CreateMemberInput, UpdateMemberInput,
  MemberQueryInput, CreateDocumentInput,
} from "./member.schema";
import { nextMemberSeq, formatMemberCode } from "../../lib/sequences";
// ─── Helpers ─────────────────────────────────────────────────


const memberSelect = {
  memberId:         true,
  memberNo:         true,
  fullName:         true,
  nik:              true,
  dateOfBirth:      true,
  jenisKelamin:     true,
  phone:            true,
  email:            true,
  address:          true,
  status:           true,
  isConsentToPhoto: true,
  createdAt:        true,
  updatedAt:        true,
  registrationBranch: { select: { branchId: true, name: true, city: true } },
  user:               { select: { userId: true, isActive: true } },
} as const;

const memberDetailSelect = {
  ...memberSelect,
  tempatLahir:      true,
  pekerjaan:        true,
  statusNikah:      true,
  emergencyContact: true,
  medicalHistory:   true,
  sumberInfoRaho:   true,
  partnershipId:    true,
  _count: {
    select: {
      packages:   true,
      encounters: true,
      documents:  true,
    },
  },
} as const;

export const memberService = {

  // ─── Member CRUD ─────────────────────────────────────────────

  create: async (data: CreateMemberInput, createdBy: string) => {
    const branch = await prisma.branch.findUnique({ where: { branchId: data.registrationBranchId } });
    if (!branch)          throw new AppError("Cabang tidak ditemukan", 404);
    if (!branch.isActive) throw new AppError("Cabang tidak aktif", 400);

    if (data.nik) {
      const existingNik = await prisma.member.findUnique({ where: { nik: data.nik } });
      if (existingNik) throw new AppError("NIK sudah terdaftar pada sistem", 409);
    }

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingEmail) throw new AppError("Email sudah digunakan", 409);
    }

    const patientRole = await prisma.role.findUnique({ where: { name: RoleName.PATIENT } });
    if (!patientRole) throw new AppError("Role PATIENT tidak ditemukan. Jalankan db:seed terlebih dahulu", 500);

    return prisma.$transaction(async (tx) => {
      const seq      = await nextMemberSeq();
      const memberNo = formatMemberCode(seq);
      const userEmail = data.email ?? `member.${memberNo.toLowerCase()}@system.raho`;

      const user = await tx.user.create({
        data: {
          email:        userEmail,
          passwordHash: "",
          roleId:       patientRole.roleId,
          branchId:     null,
          isActive:     true,
        },
      });

      const { registrationBranchId, dateOfBirth, medicalHistory, ...rest } = data;

      // ✅ Fix: cast medicalHistory ke Prisma.InputJsonValue
      const memberData: Prisma.MemberUncheckedCreateInput = {
        ...rest,
        memberNo,
        userId:               user.userId,
        registrationBranchId,
        dateOfBirth:          dateOfBirth ? new Date(dateOfBirth) : undefined,
        medicalHistory:       medicalHistory as Prisma.InputJsonValue ?? undefined,
        status:               "ACTIVE",
      };

      return tx.member.create({
        data:   memberData,
        select: memberSelect,
      });
    });
  },

  findAll: async (
    filters:   MemberQueryInput,
    requester: { role: RoleName; branchId: string | null }
  ) => {
    const { search, status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const branchId = requester.role === RoleName.ADMIN
      ? (requester.branchId ?? undefined)
      : filters.branchId;

    const where: Prisma.MemberWhereInput = {
      status,
      registrationBranchId: branchId,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { memberNo: { contains: search, mode: "insensitive" } },
          { phone:    { contains: search, mode: "insensitive" } },
          { nik:      { contains: search, mode: "insensitive" } },
          { email:    { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.member.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        select:  memberSelect,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  lookup: async (memberNo: string) => {
    const member = await prisma.member.findUnique({
      where:  { memberNo: memberNo.toUpperCase() },
      select: memberSelect,
    });
    if (!member) throw new AppError("Pasien dengan kode akun tersebut tidak ditemukan", 404);
    return member;
  },

  findById: async (memberId: string) => {
    const member = await prisma.member.findUnique({
      where:  { memberId },
      select: memberDetailSelect,
    });
    if (!member) throw new AppError("Pasien tidak ditemukan", 404);
    return member;
  },

  update: async (memberId: string, data: UpdateMemberInput) => {
    await memberService.findById(memberId);

    if (data.nik) {
      const duplicate = await prisma.member.findFirst({
        where: { nik: data.nik, NOT: { memberId } },
      });
      if (duplicate) throw new AppError("NIK sudah digunakan oleh pasien lain", 409);
    }

    const { dateOfBirth, medicalHistory, ...rest } = data;

    // ✅ Fix: explicit Prisma.MemberUncheckedUpdateInput untuk resolve ambiguity
    const updateData: Prisma.MemberUncheckedUpdateInput = {
      ...rest,
      dateOfBirth:    dateOfBirth ? new Date(dateOfBirth) : undefined,
      medicalHistory: medicalHistory as Prisma.InputJsonValue ?? undefined,
    };

    return prisma.member.update({
      where:  { memberId },
      data:   updateData,
      select: memberSelect,
    });
  },

  toggleActive: async (memberId: string) => {
    const member = await memberService.findById(memberId);
    const newStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return prisma.member.update({
      where:  { memberId },
      data:   { status: newStatus },
      select: { memberId: true, memberNo: true, fullName: true, status: true },
    });
  },

  setConsentPhoto: async (memberId: string, isConsentToPhoto: boolean) => {
    await memberService.findById(memberId);
    return prisma.member.update({
      where:  { memberId },
      data:   { isConsentToPhoto },
      select: { memberId: true, memberNo: true, fullName: true, isConsentToPhoto: true },
    });
  },

  // ─── Documents ───────────────────────────────────────────────

  createDocument: async (
    memberId:   string,
    data:       CreateDocumentInput,
    uploadedBy: string
  ) => {
    await memberService.findById(memberId);

    if (data.relatedEncounterId) {
      const encounter = await prisma.encounter.findFirst({
        where: { encounterId: data.relatedEncounterId, memberId },
      });
      if (!encounter) throw new AppError("Encounter tidak ditemukan atau bukan milik pasien ini", 404);
    }

    if (data.relatedSessionId) {
      const session = await prisma.treatmentSession.findUnique({
        where: { treatmentSessionId: data.relatedSessionId },
      });
      if (!session) throw new AppError("Sesi treatment tidak ditemukan", 404);
    }

    return prisma.memberDocument.create({
      data: { memberId, uploadedBy, ...data },
    });
  },

  findDocuments: async (memberId: string) => {
    await memberService.findById(memberId);
    return prisma.memberDocument.findMany({
      where:   { memberId },
      orderBy: { uploadedAt: "desc" },
      include: {
        uploader: {
          select: {
            userId:  true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });
  },

  deleteDocument: async (
    memberId:      string,
    docId:         string,
    requesterId:   string,
    requesterRole: RoleName
  ) => {
    const doc = await prisma.memberDocument.findFirst({
      where: { memberDocumentId: docId, memberId },
    });
    if (!doc) throw new AppError("Dokumen tidak ditemukan", 404);

    const privileged: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.MASTER_ADMIN];
    if (!privileged.includes(requesterRole) && doc.uploadedBy !== requesterId) {
      throw new AppError("Akses ditolak", 403);
    }

    await prisma.memberDocument.delete({ where: { memberDocumentId: docId } });
    return null;
  },
};
