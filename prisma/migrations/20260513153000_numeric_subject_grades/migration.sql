ALTER TABLE "subjects"
ADD COLUMN "has_numeric_grade" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "evaluations"
ADD COLUMN "numeric_grade" INTEGER;
