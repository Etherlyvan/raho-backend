import { prisma } from "./prisma";

// ─── Role Prefix Map ──────────────────────────────────────────
const ROLE_PREFIX: Record<string, string> = {
  SUPER_ADMIN:  "SAD",
  MASTER_ADMIN: "MAD",
  ADMIN:        "ADM",
  DOCTOR:       "DOC",
  NURSE:        "NRS",
};

// Roles yang tidak mendapat staffCode
const NO_STAFF_CODE_ROLES = ["SUPER_ADMIN", "PATIENT"];

// ─── Sequence Fetchers ────────────────────────────────────────

export async function nextBranchSeq(): Promise<number> {
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval('branch_code_seq')
  `;
  return Number(result[0].nextval);
}

export async function nextMemberSeq(): Promise<number> {
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval('member_code_seq')
  `;
  return Number(result[0].nextval);
}

export async function nextStaffSeq(branchCode: string, roleName: string): Promise<number> {
  // Nama sequence unik per cabang + role
  // Contoh: staff_br001_doc_seq
  const safeBranch  = branchCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const rolePrefix  = (ROLE_PREFIX[roleName] ?? "stf").toLowerCase();
  const seqName     = `staff_${safeBranch}_${rolePrefix}_seq`;

  // Buat sequence jika belum ada (idempotent)
  await prisma.$executeRawUnsafe(`
    CREATE SEQUENCE IF NOT EXISTS ${seqName}
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
  `);

  const result = await prisma.$queryRawUnsafe<[{ nextval: bigint }]>(`
    SELECT nextval('${seqName}')
  `);
  return Number((result as [{ nextval: bigint }])[0].nextval);
}

// ─── Code Formatters ──────────────────────────────────────────

export function formatBranchCode(seq: number): string {
  // RHC-BR-001
  return `RHC-BR-${String(seq).padStart(3, "0")}`;
}

export function formatMemberCode(seq: number): string {
  // RHC-2603-00001 (YY + MM + seq)
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(-2);
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  return `RHC-${yy}${mm}-${String(seq).padStart(5, "0")}`;
}

export function formatStaffCode(
  roleName:   string,
  branchCode: string,
  seq:        number
): string {
  // RHC-DOC-BR001-0001
  const prefix  = ROLE_PREFIX[roleName] ?? "STF";
  const branch  = branchCode.replace("RHC-BR-", "BR");
  return `RHC-${prefix}-${branch}-${String(seq).padStart(4, "0")}`;
}

export function needsStaffCode(roleName: string): boolean {
  return !NO_STAFF_CODE_ROLES.includes(roleName);
}
