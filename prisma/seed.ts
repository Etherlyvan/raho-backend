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

  // ─── Helper ───────────────────────────────────────────────────
  async function seedUser({
    email,
    password = "Admin@1234",
    roleName,
    fullName,
    phone,
    branchId,
    staffCode,
    jenisProfesi,
    strNumber,
    speciality,
    memberNo,
  }: {
    email:         string;
    password?:     string;
    roleName:      RoleName;
    fullName:      string;
    phone:         string;
    branchId?:     string;
    staffCode?:    string;
    jenisProfesi?: "DOKTER" | "NAKES";
    strNumber?:    string;
    speciality?:   string;
    memberNo?:     string;
  }) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error(`${roleName} role not found`);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`⏭️  ${fullName} already exists, skipping`);
      return existing;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        roleId:    role.roleId,
        branchId:  branchId ?? null,
        isActive:  true,
        staffCode: staffCode ?? null,
        profile: {
          create: {
            fullName,
            phone,
            jenisProfesi: jenisProfesi ?? null,
            strNumber:    strNumber    ?? null,
            speciality:   speciality   ?? null,
          },
        },
      },
    });

    // Buat data Member jika role PATIENT
    if (roleName === RoleName.PATIENT && memberNo) {
      await prisma.member.create({
        data: {
          memberNo,
          userId:               user.userId,      // FK langsung ✅
          registrationBranchId: branchId!,        // ← nama field yang benar
          fullName,                               // flat field, bukan nested profile
          phone,                                  // flat field
          status:               "ACTIVE",
        },
      });
    }

    console.log(`✅ ${fullName} created`);
    console.log(`   📧 Email    : ${email}`);
    console.log(`   🔑 Password : ${password}`);
    return user;
  }

  // ─── 3. Super Admin ───────────────────────────────────────────
  await seedUser({
    email:     "superadmin@raho.com",
    roleName:  RoleName.SUPER_ADMIN,
    fullName:  "Super Admin RAHO",
    phone:     "08123456789",
  });

  // ─── 4. Master Admin ──────────────────────────────────────────
  await seedUser({
    email:     "masteradmin@raho.com",
    roleName:  RoleName.MASTER_ADMIN,
    fullName:  "Master Admin RAHO",
    phone:     "08111111111",
    staffCode: "MA-001",
  });

  // ─── 5. Admin Cabang ──────────────────────────────────────────
  await seedUser({
    email:     "admin@raho.com",
    roleName:  RoleName.ADMIN,
    fullName:  "Admin Cabang Utama",
    phone:     "08198765432",
    branchId:  branch.branchId,
    staffCode: "ADM-001",
  });

  // ─── 6. Doctor ────────────────────────────────────────────────
  await seedUser({
    email:        "dokter@raho.com",
    roleName:     RoleName.DOCTOR,
    fullName:     "Dr. Budi Santoso",
    phone:        "08222222222",
    branchId:     branch.branchId,
    staffCode:    "DR-001",
    jenisProfesi: "DOKTER",
    strNumber:    "STR-DOK-001",
    speciality:   "Umum",
  });

  await seedUser({
    email:        "dokter2@raho.com",
    roleName:     RoleName.DOCTOR,
    fullName:     "Dr. Siti Rahayu",
    phone:        "08222222233",
    branchId:     branch.branchId,
    staffCode:    "DR-002",
    jenisProfesi: "DOKTER",
    strNumber:    "STR-DOK-002",
    speciality:   "Gizi Klinik",
  });

  // ─── 7. Nurse / Nakes ─────────────────────────────────────────
  await seedUser({
    email:        "nakes@raho.com",
    roleName:     RoleName.NURSE,
    fullName:     "Ani Perawati",
    phone:        "08333333333",
    branchId:     branch.branchId,
    staffCode:    "NRS-001",
    jenisProfesi: "NAKES",
    strNumber:    "STR-NRS-001",
  });

  await seedUser({
    email:        "nakes2@raho.com",
    roleName:     RoleName.NURSE,
    fullName:     "Dian Nurcahyani",
    phone:        "08333333344",
    branchId:     branch.branchId,
    staffCode:    "NRS-002",
    jenisProfesi: "NAKES",
    strNumber:    "STR-NRS-002",
  });

  // ─── 8. Patient ───────────────────────────────────────────────
  await seedUser({
    email:     "pasien@raho.com",
    roleName:  RoleName.PATIENT,
    fullName:  "Pasien Satu",
    phone:     "08444444441",
    branchId:  branch.branchId,
    memberNo:  "RA-2024001",
  });

  await seedUser({
    email:     "pasien2@raho.com",
    roleName:  RoleName.PATIENT,
    fullName:  "Pasien Dua",
    phone:     "08444444442",
    branchId:  branch.branchId,
    memberNo:  "RA-2024002",
  });

  await seedUser({
    email:     "pasien3@raho.com",
    roleName:  RoleName.PATIENT,
    fullName:  "Pasien Tiga",
    phone:     "08444444443",
    branchId:  branch.branchId,
    memberNo:  "RA-2024003",
  });

  // ─── Summary ──────────────────────────────────────────────────
  console.log("\n📋 Akun Tersedia:");
  console.log("─────────────────────────────────────────────────────");
  console.log("  Role          Email                   Password");
  console.log("─────────────────────────────────────────────────────");
  console.log("  Super Admin   superadmin@raho.com     Admin@1234");
  console.log("  Master Admin  masteradmin@raho.com    Admin@1234");
  console.log("  Admin         admin@raho.com          Admin@1234");
  console.log("  Dokter        dokter@raho.com         Admin@1234");
  console.log("  Dokter 2      dokter2@raho.com        Admin@1234");
  console.log("  Nakes         nakes@raho.com          Admin@1234");
  console.log("  Nakes 2       nakes2@raho.com         Admin@1234");
  console.log("  Pasien        pasien@raho.com         Admin@1234");
  console.log("  Pasien 2      pasien2@raho.com        Admin@1234");
  console.log("  Pasien 3      pasien3@raho.com        Admin@1234");
  console.log("─────────────────────────────────────────────────────");
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
