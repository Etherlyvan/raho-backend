-- ============================================================
-- Create sequences for human-readable code generation
-- Atomic by design — tidak ada race condition
-- ============================================================

-- Sequence untuk Branch Code (RHC-BR-001 dst.)
CREATE SEQUENCE IF NOT EXISTS branch_code_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Sequence untuk Member Code (RHC-2603-00001 dst.)
CREATE SEQUENCE IF NOT EXISTS member_code_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Sequence untuk Staff Code per Role per Cabang
-- Dibuat dinamis saat cabang pertama kali dibuat
-- Contoh nama: staff_rrhc_br_001_doc_seq
-- (dibuat via CREATE SEQUENCE IF NOT EXISTS di runtime)

-- Tambahkan kolom branchCode ke tabel branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) UNIQUE;

-- Tambahkan kolom staffCode ke tabel users  
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_code VARCHAR(30) UNIQUE;

-- Update memberNo format (data lama tidak terpengaruh)
-- Tidak ada perubahan DDL, hanya format string yang berubah di aplikasi
