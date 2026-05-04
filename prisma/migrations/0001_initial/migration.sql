-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DIRECTOR', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('TRIMESTER', 'BIMESTER', 'QUARTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AcademicPeriodStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('NOT_READY', 'READY_FOR_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'SENT', 'BLOCKED_MISSING_EMAIL');

-- CreateEnum
CREATE TYPE "ReportDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ZohoUploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ZohoSyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "zoho_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "family_email" TEXT,
    "zoho_id" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "zoho_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "grade_range" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grade_range" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "grade_from" INTEGER NOT NULL,
    "grade_to" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scale_levels" (
    "id" UUID NOT NULL,
    "grading_scale_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_scale_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AcademicPeriodType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "grade" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "period_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "general_observation" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_grades" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "scale_level_id" UUID NOT NULL,
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "status" "ReportCardStatus" NOT NULL DEFAULT 'NOT_READY',
    "director_observation" TEXT,
    "pdf_url" TEXT,
    "sent_at" TIMESTAMP(3),
    "zoho_upload_status" "ZohoUploadStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_deliveries" (
    "id" UUID NOT NULL,
    "report_card_id" UUID NOT NULL,
    "recipient_email" TEXT,
    "status" "ReportDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoho_sync_logs" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "zoho_id" TEXT,
    "action" TEXT NOT NULL,
    "status" "ZohoSyncStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoho_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_zoho_id_key" ON "users"("zoho_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "students_zoho_id_key" ON "students"("zoho_id");

-- CreateIndex
CREATE INDEX "students_grade_division_idx" ON "students"("grade", "division");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_zoho_id_key" ON "teachers"("zoho_id");

-- CreateIndex
CREATE INDEX "teachers_user_id_idx" ON "teachers"("user_id");

-- CreateIndex
CREATE INDEX "subjects_active_idx" ON "subjects"("active");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE INDEX "evaluation_criteria_subject_id_idx" ON "evaluation_criteria"("subject_id");

-- CreateIndex
CREATE INDEX "evaluation_criteria_active_idx" ON "evaluation_criteria"("active");

-- CreateIndex
CREATE INDEX "grading_scales_grade_from_grade_to_idx" ON "grading_scales"("grade_from", "grade_to");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scales_name_key" ON "grading_scales"("name");

-- CreateIndex
CREATE INDEX "grading_scale_levels_grading_scale_id_idx" ON "grading_scale_levels"("grading_scale_id");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scale_levels_grading_scale_id_value_key" ON "grading_scale_levels"("grading_scale_id", "value");

-- CreateIndex
CREATE INDEX "academic_periods_status_idx" ON "academic_periods"("status");

-- CreateIndex
CREATE INDEX "academic_periods_start_date_due_date_idx" ON "academic_periods"("start_date", "due_date");

-- CreateIndex
CREATE INDEX "course_assignments_teacher_id_idx" ON "course_assignments"("teacher_id");

-- CreateIndex
CREATE INDEX "course_assignments_subject_id_idx" ON "course_assignments"("subject_id");

-- CreateIndex
CREATE INDEX "course_assignments_period_id_idx" ON "course_assignments"("period_id");

-- CreateIndex
CREATE INDEX "course_assignments_grade_division_idx" ON "course_assignments"("grade", "division");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_teacher_id_subject_id_grade_division_per_key" ON "course_assignments"("teacher_id", "subject_id", "grade", "division", "period_id");

-- CreateIndex
CREATE INDEX "evaluations_student_id_idx" ON "evaluations"("student_id");

-- CreateIndex
CREATE INDEX "evaluations_teacher_id_idx" ON "evaluations"("teacher_id");

-- CreateIndex
CREATE INDEX "evaluations_subject_id_idx" ON "evaluations"("subject_id");

-- CreateIndex
CREATE INDEX "evaluations_period_id_idx" ON "evaluations"("period_id");

-- CreateIndex
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_student_id_teacher_id_subject_id_period_id_key" ON "evaluations"("student_id", "teacher_id", "subject_id", "period_id");

-- CreateIndex
CREATE INDEX "evaluation_grades_evaluation_id_idx" ON "evaluation_grades"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_grades_criterion_id_idx" ON "evaluation_grades"("criterion_id");

-- CreateIndex
CREATE INDEX "evaluation_grades_scale_level_id_idx" ON "evaluation_grades"("scale_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_grades_evaluation_id_criterion_id_key" ON "evaluation_grades"("evaluation_id", "criterion_id");

-- CreateIndex
CREATE INDEX "report_cards_student_id_idx" ON "report_cards"("student_id");

-- CreateIndex
CREATE INDEX "report_cards_period_id_idx" ON "report_cards"("period_id");

-- CreateIndex
CREATE INDEX "report_cards_status_idx" ON "report_cards"("status");

-- CreateIndex
CREATE INDEX "report_cards_zoho_upload_status_idx" ON "report_cards"("zoho_upload_status");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_student_id_period_id_key" ON "report_cards"("student_id", "period_id");

-- CreateIndex
CREATE INDEX "report_deliveries_report_card_id_idx" ON "report_deliveries"("report_card_id");

-- CreateIndex
CREATE INDEX "report_deliveries_status_idx" ON "report_deliveries"("status");

-- CreateIndex
CREATE INDEX "zoho_sync_logs_entity_type_entity_id_idx" ON "zoho_sync_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "zoho_sync_logs_zoho_id_idx" ON "zoho_sync_logs"("zoho_id");

-- CreateIndex
CREATE INDEX "zoho_sync_logs_status_idx" ON "zoho_sync_logs"("status");

-- CreateIndex
CREATE INDEX "zoho_sync_logs_created_at_idx" ON "zoho_sync_logs"("created_at");

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_scale_levels" ADD CONSTRAINT "grading_scale_levels_grading_scale_id_fkey" FOREIGN KEY ("grading_scale_id") REFERENCES "grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_grades" ADD CONSTRAINT "evaluation_grades_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_grades" ADD CONSTRAINT "evaluation_grades_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "evaluation_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_grades" ADD CONSTRAINT "evaluation_grades_scale_level_id_fkey" FOREIGN KEY ("scale_level_id") REFERENCES "grading_scale_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_report_card_id_fkey" FOREIGN KEY ("report_card_id") REFERENCES "report_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
