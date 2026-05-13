CREATE TYPE "SubjectEntryKind" AS ENUM ('ACADEMIC', 'TEACHER_OBSERVATION', 'ABSENCES');

ALTER TABLE "subjects"
  ADD COLUMN "entry_kind" "SubjectEntryKind" NOT NULL DEFAULT 'ACADEMIC';

ALTER TABLE "evaluations"
  ADD COLUMN "special_value" TEXT;

CREATE INDEX "subjects_entry_kind_idx" ON "subjects"("entry_kind");
