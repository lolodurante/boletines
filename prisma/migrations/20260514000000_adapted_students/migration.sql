-- Add isAdapted flag to students
ALTER TABLE "students" ADD COLUMN "is_adapted" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "students_is_adapted_idx" ON "students"("is_adapted");

-- Create adapted_criteria table
CREATE TABLE "adapted_criteria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adapted_criteria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "adapted_criteria_student_id_idx" ON "adapted_criteria"("student_id");
CREATE INDEX "adapted_criteria_subject_id_idx" ON "adapted_criteria"("subject_id");
CREATE INDEX "adapted_criteria_student_id_subject_id_idx" ON "adapted_criteria"("student_id", "subject_id");

ALTER TABLE "adapted_criteria" ADD CONSTRAINT "adapted_criteria_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "adapted_criteria" ADD CONSTRAINT "adapted_criteria_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create adapted_evaluation_grades table
CREATE TABLE "adapted_evaluation_grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "adapted_criterion_id" UUID NOT NULL,
    "scale_level_id" UUID NOT NULL,
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adapted_evaluation_grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "adapted_evaluation_grades_evaluation_id_adapted_criterion_id_key"
    ON "adapted_evaluation_grades"("evaluation_id", "adapted_criterion_id");

CREATE INDEX "adapted_evaluation_grades_evaluation_id_idx" ON "adapted_evaluation_grades"("evaluation_id");
CREATE INDEX "adapted_evaluation_grades_adapted_criterion_id_idx" ON "adapted_evaluation_grades"("adapted_criterion_id");

ALTER TABLE "adapted_evaluation_grades" ADD CONSTRAINT "adapted_evaluation_grades_evaluation_id_fkey"
    FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "adapted_evaluation_grades" ADD CONSTRAINT "adapted_evaluation_grades_adapted_criterion_id_fkey"
    FOREIGN KEY ("adapted_criterion_id") REFERENCES "adapted_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adapted_evaluation_grades" ADD CONSTRAINT "adapted_evaluation_grades_scale_level_id_fkey"
    FOREIGN KEY ("scale_level_id") REFERENCES "grading_scale_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
