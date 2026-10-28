-- Undo of rename-teacher-id.sql: owner_id -> teacher_id, idx_vivas_owner -> idx_vivas_teacher. Idempotent.
-- Roll the services back to code that reads teacher_id before or together with this.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'vivas' AND column_name = 'owner_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'vivas' AND column_name = 'teacher_id') THEN
    ALTER TABLE vivas RENAME COLUMN owner_id TO teacher_id;
  END IF;
END $$;
ALTER INDEX IF EXISTS idx_vivas_owner RENAME TO idx_vivas_teacher;
COMMIT;
