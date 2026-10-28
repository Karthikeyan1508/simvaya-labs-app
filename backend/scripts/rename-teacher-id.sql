-- vivas.teacher_id -> vivas.owner_id, and idx_vivas_teacher -> idx_vivas_owner. Idempotent. NOT RUN by anyone yet.
-- Run ONLY after every service that shares this database is deployed with code that reads owner_id
-- (viva-repo.ts VIVA_COLS / INSERT / WHERE, and the CREATE INDEX in db.ts). Old code breaks the moment this runs.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'vivas' AND column_name = 'teacher_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'vivas' AND column_name = 'owner_id') THEN
    ALTER TABLE vivas RENAME COLUMN teacher_id TO owner_id;
  END IF;
END $$;
ALTER INDEX IF EXISTS idx_vivas_teacher RENAME TO idx_vivas_owner;
COMMIT;
