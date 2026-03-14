import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const dashboardService = {

  // ──────────────────────────────────────────────────────────────────────────
  // #103 — GET /api/dashboard/admin
  // ──────────────────────────────────────────────────────────────────────────
  adminDashboard: async (requester: { role: RoleName; branchId: string | null }) => {
    const { start: todayStart, end: todayEnd } = todayRange();
    const { start: monthStart, end: monthEnd } = monthRange();

    const branchFilter =
      requester.role === RoleName.ADMIN && requester.branchId
        ? { branchId: requester.branchId }
        : {};

    const encounterBranchFilter =
      requester.role === RoleName.ADMIN && requester.branchId
        ? { encounter: { branchId: requester.branchId } }
        : {};

    const [
      todaySessions,
      monthRevenue,
      pendingInvoices,
      pendingStockRequests,
      totalActiveMembers,
    ] = await prisma.$transaction([
      // Sesi hari ini
      prisma.treatmentSession.count({
        where: {
          ...encounterBranchFilter,
          treatmentDate: { gte: todayStart, lte: todayEnd },
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
        },
      }),
      // Revenue bulan ini (invoice PAID)
      prisma.invoice.aggregate({
        where: {
          ...encounterBranchFilter,
          status: 'PAID',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Invoice pending
      prisma.invoice.count({
        where: {
          ...encounterBranchFilter,
          status: 'PENDING',
        },
      }),
      // Permintaan stok pending
      prisma.stockRequest.count({
        where: {
          item: branchFilter,
          status: 'PENDING',
        },
      }),
      // Total pasien aktif
      prisma.member.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    // Stok kritis (di bawah minThreshold) — query terpisah karena raw SQL
    const adminStockClause =
      requester.role === RoleName.ADMIN && requester.branchId
        ? Prisma.sql`AND branch_id = ${requester.branchId}`
        : Prisma.sql``;

    const adminStockAlertResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM inventory_items
      WHERE is_active = true
        AND stock <= min_threshold
        ${adminStockClause}
    `;
    const adminStockAlertCount = adminStockAlertResult[0]?.count ?? 0;

    // Jadwal sesi hari ini (detail)
    const todaySessionList = await prisma.treatmentSession.findMany({
      where: {
        ...encounterBranchFilter,
        treatmentDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      take: 10,
      orderBy: { treatmentDate: 'asc' },
      select: {
        treatmentSessionId: true,
        treatmentDate: true,
        status: true,
        infusKe: true,
        pelaksanaan: true,
        encounter: {
          select: {
            member: { select: { fullName: true, memberNo: true } },
            branch: { select: { name: true } },
          },
        },
        nurse: { select: { profile: { select: { fullName: true } } } },
      },
    });

    // Revenue 7 hari terakhir (chart data)
    const branchClause =
      requester.role === RoleName.ADMIN && requester.branchId
        ? Prisma.sql`
            AND i.treatment_session_id IN (
              SELECT ts.treatment_session_id
              FROM treatment_sessions ts
              JOIN encounters e ON ts.encounter_id = e.encounter_id
              WHERE e.branch_id = ${requester.branchId}
            )`
        : Prisma.sql``;

    const last7Days = await prisma.$queryRaw<
      { date: string; total: number }[]
    >`
      SELECT
        DATE(paid_at)::text AS date,
        SUM(amount)::float  AS total
      FROM invoices i
      WHERE
        status  = 'PAID'
        AND paid_at >= NOW() - INTERVAL '7 days'
        ${branchClause}
      GROUP BY DATE(paid_at)
      ORDER BY DATE(paid_at) ASC
    `;

    return {
      summary: {
        todaySessions,
        pendingInvoices,
        pendingStockRequests,
        totalActiveMembers,
        criticalStockCount: adminStockAlertCount,
        monthRevenue: {
          total: monthRevenue._sum.amount ?? 0,
          invoiceCount: monthRevenue._count,
        },
      },
      todaySchedule: todaySessionList,
      revenueChart: last7Days,
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #104 — GET /api/dashboard/doctor
  // ──────────────────────────────────────────────────────────────────────────
  doctorDashboard: async (userId: string, branchId: string | null) => {
    const { start: todayStart, end: todayEnd } = todayRange();
    const { start: monthStart, end: monthEnd } = monthRange();

    const [todaySessions, activeEncounters, monthSessions, totalEvaluations] =
      await prisma.$transaction([
        prisma.treatmentSession.count({
          where: {
            encounter: { doctorId: userId },
            treatmentDate: { gte: todayStart, lte: todayEnd },
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
          },
        }),
        prisma.encounter.count({
          where: {
            doctorId: userId,
            status: 'ONGOING',
          },
        }),
        prisma.treatmentSession.count({
          where: {
            encounter: { doctorId: userId },
            treatmentDate: { gte: monthStart, lte: monthEnd },
            status: 'COMPLETED',
          },
        }),
        prisma.doctorEvaluation.count({
          where: {
            doctorId: userId,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

    // Jadwal hari ini
    const schedule = await prisma.treatmentSession.findMany({
      where: {
        encounter: { doctorId: userId },
        treatmentDate: { gte: todayStart, lte: todayEnd },
      },
      take: 10,
      orderBy: { treatmentDate: 'asc' },
      select: {
        treatmentSessionId: true,
        treatmentDate: true,
        status: true,
        infusKe: true,
        therapyPlan: { select: { hhoMl: true, ifaMg: true } },
        encounter: {
          select: {
            member: { select: { fullName: true, memberNo: true } },
            memberPackage: { select: { packageName: true, packageType: true } },
          },
        },
      },
    });

    return {
      summary: {
        todaySessions,
        activeEncounters,
        monthCompletedSessions: monthSessions,
        monthEvaluations: totalEvaluations,
        evaluationRate:
          monthSessions > 0
            ? Math.round((totalEvaluations / monthSessions) * 100)
            : 0,
      },
      todaySchedule: schedule,
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #105 — GET /api/dashboard/nurse
  // ──────────────────────────────────────────────────────────────────────────
  nurseDashboard: async (branchId: string | null) => {
    if (!branchId) throw new AppError('Akun perawat tidak terikat ke cabang', 400);

    const { start: todayStart, end: todayEnd } = todayRange();

    const [todaySessions, pendingRequests, inprogressSessions] =
      await prisma.$transaction([
        prisma.treatmentSession.count({
          where: {
            encounter: { branchId },
            treatmentDate: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.stockRequest.count({
          where: { item: { branchId }, status: 'PENDING' },
        }),
        prisma.treatmentSession.count({
          where: {
            encounter: { branchId },
            status: 'IN_PROGRESS',
          },
        }),
      ]);

    // Stok kritis — query terpisah
    const nurseStockAlertResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM inventory_items
      WHERE branch_id = ${branchId}
        AND is_active  = true
        AND stock <= min_threshold
    `;
    const nurseStockAlertCount = nurseStockAlertResult[0]?.count ?? 0;

    // Jadwal sesi hari ini
    const sessionList = await prisma.treatmentSession.findMany({
      where: {
        encounter: { branchId },
        treatmentDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      take: 10,
      orderBy: { treatmentDate: 'asc' },
      select: {
        treatmentSessionId: true,
        treatmentDate: true,
        status: true,
        infusKe: true,
        pelaksanaan: true,
        therapyPlan: { select: { hhoMl: true, notes: true } },
        encounter: {
          select: {
            member: { select: { fullName: true, memberNo: true } },
          },
        },
      },
    });

    // Detail 5 item stok kritis
    const criticalStock = await prisma.$queryRaw<
      { name: string; stock: number; minThreshold: number; unit: string }[]
    >`
      SELECT name, stock, min_threshold AS "minThreshold", unit
      FROM inventory_items
      WHERE branch_id = ${branchId}
        AND is_active  = true
        AND stock <= min_threshold
      ORDER BY (stock - min_threshold) ASC
      LIMIT 5
    `;

    return {
      summary: {
        todaySessions,
        inprogressSessions,
        pendingStockRequests: pendingRequests,
        criticalStockCount: nurseStockAlertCount,
      },
      todaySchedule: sessionList,
      criticalStock,
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #106 — GET /api/dashboard/patient
  // ──────────────────────────────────────────────────────────────────────────
  patientDashboard: async (userId: string) => {
    const member = await prisma.member.findUnique({
      where: { userId },
      select: { memberId: true, fullName: true, memberNo: true },
    });
    if (!member) throw new AppError('Data pasien tidak ditemukan', 404);

    const { memberId } = member;

    const [activePackages, pendingInvoices, nextSession] =
      await prisma.$transaction([
        prisma.memberPackage.findMany({
          where: { memberId, status: 'ACTIVE' },
          select: {
            memberPackageId: true,
            packageType: true,
            packageName: true,
            totalSessions: true,
            usedSessions: true,
            expiredAt: true,
            branch: { select: { name: true, city: true } },
          },
        }),
        prisma.invoice.count({
          where: {
            memberId,
            status: { in: ['PENDING', 'OVERDUE'] },
          },
        }),
        prisma.treatmentSession.findFirst({
          where: {
            encounter: { memberId },
            status: 'PLANNED',
            treatmentDate: { gte: new Date() },
          },
          orderBy: { treatmentDate: 'asc' },
          select: {
            treatmentSessionId: true,
            treatmentDate: true,
            infusKe: true,
            pelaksanaan: true,
            encounter: {
              select: {
                branch: { select: { name: true, city: true } },
                memberPackage: { select: { packageName: true, packageType: true } },
              },
            },
          },
        }),
      ]);

    // Riwayat invoice 5 terbaru
    const recentInvoices = await prisma.invoice.findMany({
      where: { memberId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        invoiceId: true,
        amount: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return {
      member,
      summary: {
        activePackageCount: activePackages.length,
        pendingInvoiceCount: pendingInvoices,
        nextSession: nextSession ?? null,
      },
      activePackages: activePackages.map(p => ({
        ...p,
        remainingSessions: p.totalSessions - p.usedSessions,
      })),
      recentInvoices,
    };
  },
};
