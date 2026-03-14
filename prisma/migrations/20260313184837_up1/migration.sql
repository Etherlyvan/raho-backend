-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('SUPER_ADMIN', 'MASTER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT');

-- CreateEnum
CREATE TYPE "ProfesiType" AS ENUM ('DOKTER', 'NAKES');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('KLINIK', 'HOMECARE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEAD');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('BASIC', 'BOOSTER');

-- CreateEnum
CREATE TYPE "MemberPackageStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FORMULIR_PENDAFTARAN', 'SURAT_PERNYATAAN', 'SURAT_KEPUTUSAN', 'PERSETUJUAN_SETELAH_PENJELASAN', 'HASIL_LAB', 'FOTO_KONDISI', 'REKAM_MEDIS_LUAR', 'KTP', 'OTHER');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('CONSULTATION', 'TREATMENT');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PelaksanaanType" AS ENUM ('KLINIK', 'HOMECARE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "JenisBotol" AS ENUM ('IFA', 'EDTA');

-- CreateEnum
CREATE TYPE "EMRNoteType" AS ENUM ('ASSESSMENT', 'CLINICAL_NOTE', 'OPERATIONAL_NOTE', 'OUTCOME_MONITORING');

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('DOCTOR', 'NURSE', 'ADMIN');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('MEDICINE', 'DEVICE', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'REJECTED');

-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "partnership_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "jenis_profesi" "ProfesiType",
    "str_number" TEXT,
    "masa_berlaku_str" TIMESTAMP(3),
    "speciality" TEXT,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_profile_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "tipe" "BranchType" NOT NULL DEFAULT 'KLINIK',
    "operating_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "partnerships" (
    "partnership_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "tipe" "BranchType" NOT NULL DEFAULT 'KLINIK',
    "operating_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("partnership_id")
);

-- CreateTable
CREATE TABLE "members" (
    "member_id" TEXT NOT NULL,
    "member_no" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_branch_id" TEXT NOT NULL,
    "partnership_id" TEXT,
    "full_name" TEXT NOT NULL,
    "nik" TEXT,
    "tempat_lahir" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "jenis_kelamin" "JenisKelamin",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "pekerjaan" TEXT,
    "status_nikah" TEXT,
    "emergency_contact" TEXT,
    "medical_history" JSONB,
    "sumber_info_raho" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_consent_to_photo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "member_packages" (
    "member_package_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "status" "MemberPackageStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "package_name" TEXT,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "paid_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_packages_pkey" PRIMARY KEY ("member_package_id")
);

-- CreateTable
CREATE TABLE "branch_member_accesses" (
    "access_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "branch_member_accesses_pkey" PRIMARY KEY ("access_id")
);

-- CreateTable
CREATE TABLE "member_documents" (
    "member_document_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "related_encounter_id" TEXT,
    "related_session_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_documents_pkey" PRIMARY KEY ("member_document_id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "encounter_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "member_package_id" TEXT NOT NULL,
    "type" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "consultation_encounter_id" TEXT,
    "treatment_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "assessment" JSONB,
    "treatment_plan" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("encounter_id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "diagnosis_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "doktor_pemeriksa" TEXT NOT NULL,
    "diagnosa" TEXT NOT NULL,
    "icd_primer" TEXT,
    "icd_sekunder" TEXT,
    "icd_tersier" TEXT,
    "keluhan_riwayat_sekarang" TEXT,
    "riwayat_penyakit_terdahulu" TEXT,
    "riwayat_sosial_kebiasaan" TEXT,
    "riwayat_pengobatan" TEXT,
    "pemeriksaan_fisik" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("diagnosis_id")
);

-- CreateTable
CREATE TABLE "treatment_sessions" (
    "treatment_session_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "nurse_id" TEXT,
    "pelaksanaan" "PelaksanaanType",
    "infus_ke" INTEGER,
    "booster_package_id" TEXT,
    "treatment_date" TIMESTAMP(3) NOT NULL,
    "next_treatment_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "keluhan_sebelum" TEXT,
    "keluhan_sesudah" TEXT,
    "berhasil_infus" BOOLEAN,
    "healing_crisis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_sessions_pkey" PRIMARY KEY ("treatment_session_id")
);

-- CreateTable
CREATE TABLE "session_therapy_plans" (
    "session_therapy_plan_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "ifa_mg" DOUBLE PRECISION,
    "hho_ml" DOUBLE PRECISION NOT NULL,
    "h2_ml" DOUBLE PRECISION,
    "no_ml" DOUBLE PRECISION,
    "gaso_ml" DOUBLE PRECISION,
    "o2_ml" DOUBLE PRECISION,
    "notes" TEXT,
    "planned_by" TEXT NOT NULL,
    "planned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_therapy_plans_pkey" PRIMARY KEY ("session_therapy_plan_id")
);

-- CreateTable
CREATE TABLE "infusion_executions" (
    "infusion_execution_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "ifa_mg_actual" DOUBLE PRECISION,
    "hho_ml_actual" DOUBLE PRECISION,
    "h2_ml_actual" DOUBLE PRECISION,
    "no_ml_actual" DOUBLE PRECISION,
    "gaso_ml_actual" DOUBLE PRECISION,
    "o2_ml_actual" DOUBLE PRECISION,
    "tgl_produksi_cairan" TIMESTAMP(3),
    "jenis_botol" "JenisBotol",
    "jenis_cairan" TEXT,
    "volume_carrier_ml" INTEGER,
    "jumlah_penggunaan_jarum" INTEGER,
    "deviation_note" TEXT,
    "filled_by" TEXT NOT NULL,
    "filled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infusion_executions_pkey" PRIMARY KEY ("infusion_execution_id")
);

-- CreateTable
CREATE TABLE "doctor_evaluations" (
    "doctor_evaluation_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "kondisi_pasien" TEXT,
    "progress" TEXT,
    "rekomendasi_sesi" TEXT,
    "perubahan_plan" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_evaluations_pkey" PRIMARY KEY ("doctor_evaluation_id")
);

-- CreateTable
CREATE TABLE "session_vital_signs" (
    "session_vital_sign_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "measured_at" TIMESTAMP(3),
    "nadi" INTEGER,
    "pi" DECIMAL(5,2),
    "tensi_sistolik" INTEGER,
    "tensi_diastolik" INTEGER,

    CONSTRAINT "session_vital_signs_pkey" PRIMARY KEY ("session_vital_sign_id")
);

-- CreateTable
CREATE TABLE "session_photos" (
    "session_photo_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "caption" TEXT,
    "taken_at" TIMESTAMP(3),
    "taken_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_photos_pkey" PRIMARY KEY ("session_photo_id")
);

-- CreateTable
CREATE TABLE "material_usages" (
    "material_usage_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "input_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_usages_pkey" PRIMARY KEY ("material_usage_id")
);

-- CreateTable
CREATE TABLE "emr_notes" (
    "emr_note_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "treatment_session_id" TEXT,
    "author_id" TEXT NOT NULL,
    "author_role" "AuthorRole" NOT NULL,
    "type" "EMRNoteType" NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emr_notes_pkey" PRIMARY KEY ("emr_note_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "inventory_item_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "partnership_id" TEXT,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("inventory_item_id")
);

-- CreateTable
CREATE TABLE "stock_requests" (
    "stock_request_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "request_by" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("stock_request_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB NOT NULL,
    "paid_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "resource_id" TEXT,
    "resource_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "chat_room_id" TEXT NOT NULL,
    "participants" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("chat_room_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "chat_message_id" TEXT NOT NULL,
    "chat_room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("chat_message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_no_key" ON "members"("member_no");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_nik_key" ON "members"("nik");

-- CreateIndex
CREATE INDEX "member_packages_member_id_branch_id_status_idx" ON "member_packages"("member_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branch_member_accesses_member_id_branch_id_key" ON "branch_member_accesses"("member_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_therapy_plans_treatment_session_id_key" ON "session_therapy_plans"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "infusion_executions_treatment_session_id_key" ON "infusion_executions"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_evaluations_treatment_session_id_key" ON "doctor_evaluations"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_treatment_session_id_key" ON "invoices"("treatment_session_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("partnership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_registration_branch_id_fkey" FOREIGN KEY ("registration_branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_related_encounter_id_fkey" FOREIGN KEY ("related_encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_related_session_id_fkey" FOREIGN KEY ("related_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_member_package_id_fkey" FOREIGN KEY ("member_package_id") REFERENCES "member_packages"("member_package_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_consultation_encounter_id_fkey" FOREIGN KEY ("consultation_encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_booster_package_id_fkey" FOREIGN KEY ("booster_package_id") REFERENCES "member_packages"("member_package_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_therapy_plans" ADD CONSTRAINT "session_therapy_plans_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_therapy_plans" ADD CONSTRAINT "session_therapy_plans_planned_by_fkey" FOREIGN KEY ("planned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infusion_executions" ADD CONSTRAINT "infusion_executions_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infusion_executions" ADD CONSTRAINT "infusion_executions_filled_by_fkey" FOREIGN KEY ("filled_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_evaluations" ADD CONSTRAINT "doctor_evaluations_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_evaluations" ADD CONSTRAINT "doctor_evaluations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_vital_signs" ADD CONSTRAINT "session_vital_signs_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_taken_by_fkey" FOREIGN KEY ("taken_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_input_by_fkey" FOREIGN KEY ("input_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("partnership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_request_by_fkey" FOREIGN KEY ("request_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("chat_room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
