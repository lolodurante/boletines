ALTER TABLE "academic_periods"
ADD COLUMN IF NOT EXISTS "teacher_deadline" TIMESTAMP(3);

UPDATE "academic_periods"
SET "teacher_deadline" = "due_date"
WHERE "teacher_deadline" IS NULL;
