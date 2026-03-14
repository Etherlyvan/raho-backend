import { Prisma, RoleName } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import {
  ExportReportInput,
  InventoryReportInput,
  RevenueReportInput,
  StaffKpiInput,
  TreatmentReportInput,
} from './reports.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveBranchScope(
  requester: { role: RoleName; branchId: string | null },
  filterBranchId?: string,
): string | undefined {
  if (requester.role === RoleName.ADMIN) return requester.branchId ?? undefined;
  return filterBranchId;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r: Record<string, unknown>) =>
    headers.map((h: string) => {
      const v = r[h];
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(','),
  );
  return [headers.join(','), ...lines].join('\n');
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const reportsService = {

  // ──────────────────────────────────────────────────────────────────────────
  // #108 — GET /api/reports/revenue
  // ──────────────────────────────────────────────────────────────────────────
  revenue: async (
    filters: RevenueReportInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const effectiveBranchId = resolveBranchScope(requester, filters.branchId);
    const dateFrom = new Date(filters.dateFrom);
    const dateTo   = new Date(filters.dateTo);

    const revenueBranchClause = effectiveBranchId
      ? Prisma.sql`
          AND i.treatment_session_id IN (
            SELECT ts2.treatment_session_id
            FROM treatment_sessions ts2
            JOIN encounters e ON ts2.encounter_id = e.encounter_id
            WHERE e.branch_id = ${effectiveBranchId}
          )`
      : Prisma.sql``;

    const groupFormat =
      filters.groupBy === 'month'
        ? Prisma.sql`TO_CHAR(paid_at, 'YYYY-MM')`
        : filters.groupBy === 'week'
        ? Prisma.sql`TO_CHAR(DATE_TRUNC('week', paid_at), 'YYYY-MM-DD')`
        : Prisma.sql`DATE(paid_at)::text`;

    const revenueRows = await prisma.$queryRaw<
      { period: string; totalRevenue: number; invoiceCount: number }[]
    >`
      SELECT
        ${groupFormat}                AS period,
        SUM(i.amount)::float          AS "totalRevenue",
        COUNT(*)::int                 AS "invoiceCount"
      FROM invoices i
      LEFT JOIN treatment_sessions ts ON i.treatment_session_id = ts.treatment_session_id
      WHERE
        i.status  = 'PAID'
        AND i.paid_at >= ${dateFrom}
        AND i.paid_at <= ${dateTo}
        ${revenueBranchClause}
      GROUP BY ${groupFormat}
      ORDER BY ${groupFormat} ASC
    `;

    const totalRevenue  = revenueRows.reduce((s: number, r: { totalRevenue: number }) => s + r.totalRevenue, 0);
    const totalInvoices = revenueRows.reduce((s: number, r: { invoiceCount: number }) => s + r.invoiceCount, 0);

    return {
      summary: { totalRevenue, totalInvoices, period: { from: dateFrom, to: dateTo } },
      data: revenueRows,
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #109 — GET /api/reports/treatment
  // ──────────────────────────────────────────────────────────────────────────
  treatment: async (
    filters: TreatmentReportInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const effectiveBranchId = resolveBranchScope(requester, filters.branchId);
    const dateFrom = new Date(filters.dateFrom);
    const dateTo   = new Date(filters.dateTo);

    const where: Prisma.TreatmentSessionWhereInput = {
      treatmentDate: { gte: dateFrom, lte: dateTo },
      status: 'COMPLETED',
      ...(effectiveBranchId ? { encounter: { branchId: effectiveBranchId } } : {}),
    };

    const [total, byPelaksanaan, berhasilCount, healingCrisisCount] =
      await prisma.$transaction([
        prisma.treatmentSession.count({ where }),
        prisma.treatmentSession.groupBy({
          by: ['pelaksanaan'],
          where,
          _count: true,
          orderBy: { _count: { pelaksanaan: 'desc' } },
        }),
        prisma.treatmentSession.count({ where: { ...where, berhasilInfus: true } }),
        prisma.treatmentSession.count({
          where: { ...where, NOT: { healingCrisis: null } },
        }),
      ]);

    const avgInfusKe = await prisma.treatmentSession.aggregate({
      where,
      _avg: { infusKe: true },
    });

    return {
      summary: {
        totalCompletedSessions: total,
        berhasilInfus:   berhasilCount,
        gagalInfus:      total - berhasilCount,
        successRate:     total > 0 ? Math.round((berhasilCount / total) * 100) : 0,
        healingCrisisCount,
        avgInfusKe:      Math.round((avgInfusKe._avg.infusKe ?? 0) * 10) / 10,
      },
      byPelaksanaan: byPelaksanaan.map(g => ({
        pelaksanaan: g.pelaksanaan,
        count: g._count as number,
      })),
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #110 — GET /api/reports/inventory
  // ──────────────────────────────────────────────────────────────────────────
  inventory: async (
    filters: InventoryReportInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const effectiveBranchId = resolveBranchScope(requester, filters.branchId);
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo   = filters.dateTo   ? new Date(filters.dateTo)   : undefined;

    const where: Prisma.MaterialUsageWhereInput = {
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo   ? { lte: dateTo }   : {}),
            },
          }
        : {}),
      ...(effectiveBranchId ? { item: { branchId: effectiveBranchId } } : {}),
      ...(filters.category  ? { item: { category: filters.category } }  : {}),
    };

    const topItems = await prisma.materialUsage.groupBy({
      by: ['inventoryItemId'],
      where,
      _sum:   { quantity: true },
      _count: { materialUsageId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const itemIds     = topItems.map(i => i.inventoryItemId);
    const itemDetails = await prisma.inventoryItem.findMany({
      where: { inventoryItemId: { in: itemIds } },
      select: { inventoryItemId: true, name: true, category: true, unit: true },
    });

    const itemMap = Object.fromEntries(
      itemDetails.map(i => [i.inventoryItemId, i]),
    );

    const currentStock = await prisma.inventoryItem.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
      select: {
        inventoryItemId: true,
        name: true,
        category: true,
        unit: true,
        stock: true,
        minThreshold: true,
      },
    });

    return {
      topUsedItems: topItems.map(i => ({
        ...itemMap[i.inventoryItemId],
        totalQuantityUsed: i._sum.quantity        ?? 0,
        usageCount:        i._count.materialUsageId,
      })),
      currentStock,
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #111 — GET /api/reports/staff-kpi
  // ──────────────────────────────────────────────────────────────────────────
  staffKpi: async (
    filters: StaffKpiInput,
    requester: { role: RoleName; branchId: string | null },
  ) => {
    const effectiveBranchId = resolveBranchScope(requester, filters.branchId);
    const dateFrom = new Date(filters.dateFrom);
    const dateTo   = new Date(filters.dateTo);

    // ── KPI Dokter: encounter per dokter ─────────────────────────────────────
    const doctorKpi = await prisma.encounter.groupBy({
      by: ['doctorId'],
      where: {
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { encounterId: true },
      orderBy: { _count: { encounterId: 'desc' } },
    });

    const doctorIds    = doctorKpi.map(d => d.doctorId);
    const doctorDetails = await prisma.user.findMany({
      where: { userId: { in: doctorIds } },
      select: {
        userId:    true,
        staffCode: true,
        profile:   { select: { fullName: true } },
      },
    });
    const doctorMap = Object.fromEntries(
      doctorDetails.map(d => [d.userId, d]),
    );

    // ── ✅ Sesi completed per dokter (fix Bug #3) ─────────────────────────────
    // Tidak bisa groupBy encounterId karena TreatmentSession tidak punya doctorId.
    // Solusi: findMany via encounter relation, lalu hitung manual.
    const completedSessionsPerDoctor = await prisma.treatmentSession.findMany({
      where: {
        encounter: {
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          doctorId: { in: doctorIds },
        },
        treatmentDate: { gte: dateFrom, lte: dateTo },
        status: 'COMPLETED',
      },
      select: {
        encounter: { select: { doctorId: true } },
      },
    });

    const sessionsMap: Record<string, number> = {};
    for (const s of completedSessionsPerDoctor) {
      const did = s.encounter.doctorId;
      sessionsMap[did] = (sessionsMap[did] ?? 0) + 1;
    }

    // ── Evaluasi per dokter ───────────────────────────────────────────────────
    const evaluations = await prisma.doctorEvaluation.groupBy({
      by: ['doctorId'],
      where: {
        session: {
          encounter: effectiveBranchId ? { branchId: effectiveBranchId } : {},
          treatmentDate: { gte: dateFrom, lte: dateTo },
        },
      },
      _count:  { doctorEvaluationId: true },
      orderBy: { _count: { doctorEvaluationId: 'desc' } },
    });
    const evalMap = Object.fromEntries(
      evaluations.map(e => [e.doctorId, e._count.doctorEvaluationId]),
    );

    // ── KPI Perawat: sesi completed per perawat ───────────────────────────────
    const nurseKpi = await prisma.treatmentSession.groupBy({
      by: ['nurseId'],
      where: {
        ...(effectiveBranchId ? { encounter: { branchId: effectiveBranchId } } : {}),
        nurseId:       { not: null },
        treatmentDate: { gte: dateFrom, lte: dateTo },
        status:        'COMPLETED',
      },
      _count:  { treatmentSessionId: true },
      orderBy: { _count: { treatmentSessionId: 'desc' } },
    });

    const nurseIds     = nurseKpi.map(n => n.nurseId!).filter(Boolean);
    const nurseDetails = await prisma.user.findMany({
      where: { userId: { in: nurseIds } },
      select: {
        userId:    true,
        staffCode: true,
        profile:   { select: { fullName: true } },
      },
    });
    const nurseMap = Object.fromEntries(
      nurseDetails.map(n => [n.userId, n]),
    );

    return {
      doctors: doctorKpi.map(d => ({
        ...doctorMap[d.doctorId],
        totalEncounters:  d._count.encounterId,
        completedSessions: sessionsMap[d.doctorId] ?? 0,
        totalEvaluations: evalMap[d.doctorId]      ?? 0,
      })),
      nurses: nurseKpi.map(n => ({
        ...nurseMap[n.nurseId!],
        completedSessions: n._count.treatmentSessionId,
      })),
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // #112 — GET /api/reports/export
  // ──────────────────────────────────────────────────────────────────────────
  export: async (
    filters: ExportReportInput,
    requester: { role: RoleName; branchId: string | null },
  ): Promise<{ filename: string; csv: string }> => {
    const { type } = filters;

    let rows: Record<string, unknown>[] = [];
    let filename = '';

    if (type === 'revenue') {
      const result = await reportsService.revenue(
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo, groupBy: 'day', branchId: filters.branchId },
        requester,
      );
      rows = result.data.map(r => ({
        'Periode':             r.period,
        'Total Revenue (Rp)':  r.totalRevenue,
        'Jumlah Invoice':      r.invoiceCount,
      }));
      filename = `laporan-revenue-${filters.dateFrom.slice(0, 10)}-to-${filters.dateTo.slice(0, 10)}.csv`;

    } else if (type === 'treatment') {
      const result = await reportsService.treatment(
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo, branchId: filters.branchId },
        requester,
      );
      rows = result.byPelaksanaan.map(r => ({
        'Pelaksanaan': r.pelaksanaan,
        'Jumlah Sesi': r.count,
      }));
      rows.push({ 'Pelaksanaan': 'TOTAL', 'Jumlah Sesi': result.summary.totalCompletedSessions });
      filename = `laporan-treatment-${filters.dateFrom.slice(0, 10)}-to-${filters.dateTo.slice(0, 10)}.csv`;

    } else if (type === 'inventory') {
      const result = await reportsService.inventory(
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo, branchId: filters.branchId },
        requester,
      );
      rows = result.topUsedItems.map(r => ({
        'Nama Item':          r.name,
        'Kategori':           r.category,
        'Satuan':             r.unit,
        'Total Pemakaian':    r.totalQuantityUsed,
        'Frekuensi Pemakaian': r.usageCount,
      }));
      filename = `laporan-inventori-${filters.dateFrom.slice(0, 10)}-to-${filters.dateTo.slice(0, 10)}.csv`;

    } else {
      // staff-kpi
      const result = await reportsService.staffKpi(
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo, branchId: filters.branchId },
        requester,
      );
      rows = [
        ...result.doctors.map(d => ({
          'Role':              'DOCTOR',
          'Staff Code':        d.staffCode,
          'Nama':              d.profile?.fullName ?? '-',
          'Total Encounter':   d.totalEncounters,
          'Sesi Completed':    d.completedSessions,
          'Total Evaluasi':    d.totalEvaluations,
        })),
        ...result.nurses.map(n => ({
          'Role':              'NURSE',
          'Staff Code':        n.staffCode,
          'Nama':              n.profile?.fullName ?? '-',
          'Total Encounter':   '-',
          'Sesi Completed':    n.completedSessions,
          'Total Evaluasi':    '-',
        })),
      ];
      filename = `laporan-staff-kpi-${filters.dateFrom.slice(0, 10)}-to-${filters.dateTo.slice(0, 10)}.csv`;
    }

    return { filename, csv: toCsv(rows) };
  },
};
