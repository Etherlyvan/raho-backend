import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateSessionPhotoInput } from './session-photo.schema';

const photoSelect = {
  sessionPhotoId: true,
  treatmentSessionId: true,
  memberId: true,
  photoUrl: true,
  fileName: true,
  fileSizeBytes: true,
  caption: true,
  takenAt: true,
  createdAt: true,
  takenByUser: {
    select: {
      userId: true,
      staffCode: true,
      profile: { select: { fullName: true } },
    },
  },
} as const;

export const sessionPhotoService = {
  /**
   * #64 — POST /:sessionId/photos
   * Wajib cek isConsentToPhoto sebelum upload.
   */
  create: async (
    treatmentSessionId: string,
    data: CreateSessionPhotoInput,
    takenBy: string,
  ) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId },
      include: {
        encounter: {
          include: {
            member: { select: { memberId: true, isConsentToPhoto: true, fullName: true } },
          },
        },
      },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    if (session.status !== 'IN_PROGRESS') {
      throw new AppError(
        `Foto hanya dapat diambil saat sesi IN_PROGRESS, status saat ini: ${session.status}`,
        400,
      );
    }

    // Gate: consent foto
    if (!session.encounter.member.isConsentToPhoto) {
      throw new AppError(
        `Pasien ${session.encounter.member.fullName} belum memberikan persetujuan pengambilan foto`,
        403,
      );
    }

    return prisma.sessionPhoto.create({
      data: {
        treatmentSessionId,
        memberId: session.encounter.member.memberId,
        takenBy,
        photoUrl: data.photoUrl,
        fileName: data.fileName,
        fileSizeBytes: data.fileSizeBytes ?? null,
        caption: data.caption ?? null,
        takenAt: data.takenAt ? new Date(data.takenAt) : new Date(),
      },
      select: photoSelect,
    });
  },

  /**
   * #65 — GET /:sessionId/photos
   */
  findAll: async (treatmentSessionId: string) => {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId },
      select: { treatmentSessionId: true },
    });
    if (!session) throw new AppError('Sesi treatment tidak ditemukan', 404);

    return prisma.sessionPhoto.findMany({
      where: { treatmentSessionId },
      orderBy: { createdAt: 'asc' },
      select: photoSelect,
    });
  },

  /**
   * #66 — DELETE /:sessionId/photos/:photoId
   */
  remove: async (treatmentSessionId: string, sessionPhotoId: string): Promise<void> => {
    const photo = await prisma.sessionPhoto.findFirst({
      where: { sessionPhotoId, treatmentSessionId },
    });
    if (!photo) throw new AppError('Foto tidak ditemukan', 404);

    await prisma.sessionPhoto.delete({ where: { sessionPhotoId } });
  },
};
