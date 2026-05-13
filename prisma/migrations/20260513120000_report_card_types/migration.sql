CREATE TYPE "ReportCardType" AS ENUM ('ESPANOL', 'INGLES');

ALTER TABLE "subjects"
  ADD COLUMN "type" "ReportCardType" NOT NULL DEFAULT 'ESPANOL';

UPDATE "subjects"
SET "type" = 'INGLES'
WHERE lower(translate("name", 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) IN ('ingles', 'english');

ALTER TABLE "report_cards"
  ADD COLUMN "type" "ReportCardType" NOT NULL DEFAULT 'ESPANOL';

DROP INDEX IF EXISTS "report_cards_student_id_period_id_key";

CREATE INDEX "subjects_type_idx" ON "subjects"("type");
CREATE INDEX "report_cards_type_idx" ON "report_cards"("type");
CREATE UNIQUE INDEX "report_cards_student_id_period_id_type_key" ON "report_cards"("student_id", "period_id", "type");

INSERT INTO "report_cards" ("student_id", "period_id", "type", "status", "pdf_status", "created_at", "updated_at")
SELECT
  s."id",
  ca."period_id",
  'INGLES'::"ReportCardType",
  'READY_FOR_REVIEW'::"ReportCardStatus",
  'PENDING'::"ReportCardPdfStatus",
  now(),
  now()
FROM "students" s
JOIN "course_assignments" ca
  ON ca."grade" = s."grade"
  AND ca."division" = s."division"
JOIN "subjects" subj
  ON subj."id" = ca."subject_id"
  AND subj."active" = true
  AND subj."type" = 'INGLES'
WHERE s."status" = 'ACTIVE'
GROUP BY s."id", ca."period_id"
HAVING count(*) = count(*) FILTER (
  WHERE EXISTS (
    SELECT 1
    FROM "evaluations" e
    WHERE e."student_id" = s."id"
      AND e."period_id" = ca."period_id"
      AND e."teacher_id" = ca."teacher_id"
      AND e."subject_id" = ca."subject_id"
      AND e."status" IN ('SUBMITTED', 'APPROVED')
  )
)
ON CONFLICT ("student_id", "period_id", "type") DO NOTHING;
