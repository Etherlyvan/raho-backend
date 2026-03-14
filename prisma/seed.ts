/// <reference types="node" />

import { PrismaClient, RoleName } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── 1. Roles ────────────────────────────────────────────────
  const roleData = [
    { name: RoleName.SUPER_ADMIN,  permissions: ["*"] },
    { name: RoleName.MASTER_ADMIN, permissions: ["branch:*", "user:*", "member:*", "report:read"] },
    { name: RoleName.ADMIN,        permissions: ["member:*", "package:*", "invoice:*", "inventory:read"] },
    { name: RoleName.DOCTOR,       permissions: ["encounter:*", "diagnosis:*", "session:read", "emr:*"] },
    { name: RoleName.NURSE,        permissions: ["session:*", "vital:*", "material:*", "photo:*"] },
    { name: RoleName.PATIENT,      permissions: ["self:read"] },
  ];

  for (const role of roleData) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("✅ Roles seeded (6 roles)");

  // ─── 2. Default Branch ────────────────────────────────────────
  let branch = await prisma.branch.findFirst({ where: { name: "Cabang Utama" } });
  if (!branch) {
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval('branch_code_seq')
  `;
  const seq        = Number(result[0].nextval);
  const branchCode = `RHC-BR-${String(seq).padStart(3, "0")}`;

    branch = await prisma.branch.create({
      data: {
        branchCode,
        name:           "Cabang Utama",
        address:        "Jl. Raya Utama No. 1",
        city:           "Jakarta",
        phone:          "021-12345678",
        tipe:           "KLINIK",
        operatingHours: "08:00 - 17:00",
        isActive:       true,
      },
    });
   console.log(`✅ Default branch created: ${branch.name} [${branchCode}]`);
  } else {
    console.log("⏭️  Default branch already exists, skipping");
  }

  // ─── 3. Super Admin ───────────────────────────────────────────
  const superAdminRole = await prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role not found");

  const existingSuperAdmin = await prisma.user.findUnique({ where: { email: "superadmin@raho.com" } });
  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash("Admin@1234", 12);
    await prisma.user.create({
      data: {
        email:        "superadmin@raho.com",
        passwordHash,
        roleId:       superAdminRole.roleId,
        isActive:     true,
        profile: {
          create: {
            fullName: "Super Admin RAHO",
            phone:    "08123456789",
          },
        },
      },
    });
    console.log("✅ Super Admin created");
    console.log("   📧 Email    : superadmin@raho.com");
    console.log("   🔑 Password : Admin@1234");
  } else {
    console.log("⏭️  Super Admin already exists, skipping");
  }

  // ─── 4. Admin Cabang (untuk testing) ─────────────────────────
  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
  if (!adminRole) throw new Error("ADMIN role not found");

  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@raho.com" } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@1234", 12);
    await prisma.user.create({
      data: {
        email:        "admin@raho.com",
        passwordHash,
        roleId:       adminRole.roleId,
        branchId:     branch.branchId,
        isActive:     true,
        profile: {
          create: {
            fullName: "Admin Cabang Utama",
            phone:    "08198765432",
          },
        },
      },
    });
    console.log("✅ Admin Cabang created");
    console.log("   📧 Email    : admin@raho.com");
    console.log("   🔑 Password : Admin@1234");
  } else {
    console.log("⏭️  Admin Cabang already exists, skipping");
  }

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
